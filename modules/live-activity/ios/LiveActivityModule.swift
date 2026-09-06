import ActivityKit
import ExpoModulesCore

// Мост между JS и ActivityKit.
//
// Сам интерфейс островка рисует таргет targets/scan — сюда он не заглядывает.
// Здесь только жизненный цикл активности: запустить, обновить, погасить.
//
// Всё завязано на iOS 16.2+, поэтому каждая функция начинается с проверки
// доступности и на старых системах честно возвращает false, а не падает.

public class LiveActivityModule: Module {
  // Тип Activity<…> помечен @available, а хранимое свойство так пометить
  // нельзя — поэтому держим как Any и приводим на месте.
  private var activities: [String: Any] = [:]

  public func definition() -> ModuleDefinition {
    Name("LiveActivity")

    Function("isSupported") { () -> Bool in
      guard #available(iOS 16.2, *) else { return false }
      // Пользователь может выключить Live Activities для приложения в
      // настройках — тогда request() бросит исключение. Спрашиваем заранее.
      return ActivityAuthorizationInfo().areActivitiesEnabled
    }

    AsyncFunction("start") { (id: String, state: ScanStateRecord) -> Bool in
      guard #available(iOS 16.2, *) else { return false }
      guard ActivityAuthorizationInfo().areActivitiesEnabled else { return false }

      // Повторный старт с тем же id — это тот же скан (например, пересканирование
      // уже загруженного фото). Не плодим вторую активность, а обновляем.
      if let existing = self.activities[id] as? Activity<ScanActivityAttributes> {
        await existing.update(ActivityContent(state: state.contentState(), staleDate: state.staleDate()))
        return true
      }

      do {
        let activity = try Activity<ScanActivityAttributes>.request(
          attributes: ScanActivityAttributes(scanId: id),
          content: ActivityContent(state: state.contentState(), staleDate: state.staleDate()),
          pushType: nil
        )
        self.activities[id] = activity
        return true
      } catch {
        // Лимит одновременных активностей, запрет пользователя, запуск из
        // фона — всё это штатные отказы. Скан от них зависеть не должен.
        return false
      }
    }

    AsyncFunction("update") { (id: String, state: ScanStateRecord) -> Bool in
      guard #available(iOS 16.2, *) else { return false }
      guard let activity = self.activities[id] as? Activity<ScanActivityAttributes> else { return false }

      await activity.update(ActivityContent(state: state.contentState(), staleDate: state.staleDate()))
      return true
    }

    AsyncFunction("end") { (id: String, state: ScanStateRecord, keepVisibleSeconds: Double) -> Bool in
      guard #available(iOS 16.2, *) else { return false }
      guard let activity = self.activities[id] as? Activity<ScanActivityAttributes> else { return false }

      // Итог показываем ещё немного, чтобы результат успели прочитать, —
      // .immediate убрал бы островок в ту же секунду.
      let policy: ActivityUIDismissalPolicy = keepVisibleSeconds > 0
        ? .after(Date().addingTimeInterval(keepVisibleSeconds))
        : .immediate

      await activity.end(ActivityContent(state: state.contentState(), staleDate: nil), dismissalPolicy: policy)
      self.activities.removeValue(forKey: id)
      return true
    }

    AsyncFunction("endAll") { () -> Int in
      guard #available(iOS 16.2, *) else { return 0 }

      // Если приложение убили посреди скана, активность переживёт перезапуск и
      // навсегда останется в состоянии «распознаю». Перебираем именно
      // Activity.activities, а не свой словарь: он после перезапуска пуст.
      var count = 0
      for activity in Activity<ScanActivityAttributes>.activities {
        await activity.end(nil, dismissalPolicy: .immediate)
        count += 1
      }
      self.activities.removeAll()
      return count
    }
  }
}

// MARK: - Аргументы из JS

struct ScanStateRecord: Record {
  @Field var status: String = "processing"
  @Field var title: String = ""
  @Field var subtitle: String = ""
  @Field var amount: String = ""
  @Field var startedAt: Double = 0
  @Field var estimatedEndAt: Double = 0
}

@available(iOS 16.2, *)
extension ScanStateRecord {
  func contentState() -> ScanActivityAttributes.ContentState {
    ScanActivityAttributes.ContentState(
      status: status,
      title: title,
      subtitle: subtitle,
      amount: amount,
      startedAt: startedAt,
      estimatedEndAt: estimatedEndAt
    )
  }

  /// После этого момента система считает данные протухшими и приглушает
  /// карточку. Нужен на случай, когда приложение умерло, не успев погасить
  /// активность: иначе островок вечно показывал бы «распознаю чек».
  func staleDate() -> Date? {
    guard status == "processing" else { return nil }
    return Date(timeIntervalSince1970: max(estimatedEndAt, startedAt + 1)).addingTimeInterval(120)
  }
}
