import WidgetKit
import SwiftUI

// Общая группа приложений — тот же идентификатор, что в app.json
// (ios.entitlements) и в src/services/widget/expensesWidget.ts.
private let appGroupId = "group.com.dilukliu0.iospochet"
private let storageKey = "expenses_widget_data"

private struct CategoryRow: Codable, Identifiable {
  var id: String { name }
  let name: String
  let amount: Double
  let percent: Double
  let color: String
}

private struct WidgetData: Codable {
  let total: Double
  let currency: String
  let periodLabel: String
  let categories: [CategoryRow]
}

private extension Color {
  init(hex: String) {
    var s = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
    var value: UInt64 = 0
    Scanner(string: s).scanHexInt64(&value)
    let r = Double((value >> 16) & 0xFF) / 255
    let g = Double((value >> 8) & 0xFF) / 255
    let b = Double(value & 0xFF) / 255
    self.init(red: r, green: g, blue: b)
  }
}

private func loadWidgetData() -> WidgetData? {
  guard let defaults = UserDefaults(suiteName: appGroupId),
        let raw = defaults.string(forKey: storageKey),
        let data = raw.data(using: .utf8)
  else { return nil }
  return try? JSONDecoder().decode(WidgetData.self, from: data)
}

private func formatAmount(_ n: Double, _ currency: String) -> String {
  let rounded = n.rounded()
  let s = String(format: "%.0f", rounded)
  return "\(s) \(currency)"
}

struct ExpensesEntry: TimelineEntry {
  let date: Date
  let data: WidgetData?
}

struct ExpensesProvider: TimelineProvider {
  func placeholder(in context: Context) -> ExpensesEntry {
    ExpensesEntry(
      date: Date(),
      data: WidgetData(
        total: 3284,
        currency: "CZK",
        periodLabel: "Всего за месяц",
        categories: [
          CategoryRow(name: "Продукты", amount: 1387, percent: 42, color: "#7FAE86"),
          CategoryRow(name: "Кафе и рестораны", amount: 569, percent: 17, color: "#CB8571"),
          CategoryRow(name: "Гигиена", amount: 500, percent: 15, color: "#7FAEB0"),
        ]
      )
    )
  }

  func getSnapshot(in context: Context, completion: @escaping (ExpensesEntry) -> Void) {
    completion(ExpensesEntry(date: Date(), data: loadWidgetData()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<ExpensesEntry>) -> Void) {
    let entry = ExpensesEntry(date: Date(), data: loadWidgetData())
    // Виджет также обновляется мгновенно из приложения через
    // ExtensionStorage.reloadWidget() — это плановое обновление раз в час
    // просто подстраховка на случай, если приложение долго не открывали.
    let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
    completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
  }
}

private struct CategoryRowView: View {
  let row: CategoryRow
  let currency: String

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      HStack(spacing: 8) {
        Circle()
          .fill(Color(hex: row.color))
          .frame(width: 7, height: 7)
        Text(row.name)
          .font(.system(size: 12, weight: .medium))
          .foregroundColor(.white)
          .lineLimit(1)
        Spacer()
        Text(formatAmount(row.amount, currency))
          .font(.system(size: 12, weight: .semibold))
          .foregroundColor(.white)
        Text("\(Int(row.percent.rounded()))%")
          .font(.system(size: 11))
          .foregroundColor(Color.white.opacity(0.5))
          .frame(width: 30, alignment: .trailing)
      }
      GeometryReader { geo in
        ZStack(alignment: .leading) {
          Capsule().fill(Color.white.opacity(0.12)).frame(height: 3)
          Capsule()
            .fill(Color(hex: row.color))
            .frame(width: max(geo.size.width * min(row.percent / 100, 1), 3), height: 3)
        }
      }
      .frame(height: 3)
    }
  }
}

struct ExpensesWidgetEntryView: View {
  @Environment(\.widgetFamily) var family
  var entry: ExpensesProvider.Entry

  var body: some View {
    if let data = entry.data {
      VStack(alignment: .leading, spacing: 10) {
        Text(data.periodLabel)
          .font(.system(size: 11))
          .foregroundColor(Color.white.opacity(0.55))
        Text(formatAmount(data.total, data.currency))
          .font(.system(size: 26, weight: .heavy))
          .foregroundColor(.white)

        if family != .systemSmall {
          let rowCount = family == .systemLarge ? 6 : 3
          VStack(spacing: 8) {
            ForEach(data.categories.prefix(rowCount)) { row in
              CategoryRowView(row: row, currency: data.currency)
            }
          }
          .padding(.top, 2)
        }
        Spacer(minLength: 0)
      }
      .padding(16)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      .background(Color(hex: "#07090E"))
      .widgetURL(URL(string: "aiphone://"))
    } else {
      VStack(spacing: 6) {
        Text("Расходы")
          .font(.system(size: 14, weight: .semibold))
          .foregroundColor(.white)
        Text("Откройте приложение,\nчтобы увидеть данные")
          .font(.system(size: 11))
          .foregroundColor(Color.white.opacity(0.55))
          .multilineTextAlignment(.center)
      }
      .padding(16)
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .background(Color(hex: "#07090E"))
      .widgetURL(URL(string: "aiphone://"))
    }
  }
}

struct ExpensesWidget: Widget {
  let kind: String = "ExpensesWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: ExpensesProvider()) { entry in
      ExpensesWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("Расходы")
    .description("Итог месяца и топ категорий трат.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    .contentMarginsDisabled()
  }
}

@main
struct ExpensesWidgetBundle: WidgetBundle {
  var body: some Widget {
    ExpensesWidget()
  }
}
