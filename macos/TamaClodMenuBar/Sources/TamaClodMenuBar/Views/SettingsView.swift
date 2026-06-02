import SwiftUI
import TamaClodCore

struct SettingsView: View {
    @ObservedObject var model: AppModel

    var body: some View {
        Form {
            Picker("Notifications", selection: $model.notificationMode) {
                ForEach(NotificationMode.allCases, id: \.rawValue) { mode in
                    Text(mode.title).tag(mode)
                }
            }
            Text("The menu bar popover is the primary app surface for this prototype.")
                .foregroundStyle(.secondary)
        }
        .padding(24)
        .frame(width: 360)
    }
}
