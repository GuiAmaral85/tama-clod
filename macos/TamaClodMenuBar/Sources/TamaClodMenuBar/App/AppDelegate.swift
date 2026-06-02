import AppKit
import TamaClodCore
import UserNotifications

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate, UNUserNotificationCenterDelegate {
    let model = AppModel()
    private var statusController: StatusItemController?

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)

        let controller = StatusItemController(model: model)
        statusController = controller
        model.animatedPresenter = controller

        UNUserNotificationCenter.current().delegate = self
        model.start()
    }

    func applicationWillTerminate(_ notification: Notification) {
        model.stop()
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .sound]
    }
}
