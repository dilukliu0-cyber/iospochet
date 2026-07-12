/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'widget',
  name: 'expenses_widget',
  displayName: 'Расходы',
  frameworks: ['SwiftUI'],
  entitlements: {
    'com.apple.security.application-groups': ['group.com.dilukliu0.iospochet'],
  },
};
