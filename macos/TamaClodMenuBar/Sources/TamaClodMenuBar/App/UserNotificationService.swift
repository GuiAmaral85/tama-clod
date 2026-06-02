import Foundation
import TamaClodCore
import UserNotifications

@MainActor
final class UserNotificationService {
    func deliver(_ event: MilestoneEvent) async -> Bool {
        let center = UNUserNotificationCenter.current()
        let authorizationStatus = await authorizationStatus(center: center)

        switch authorizationStatus {
        case .authorized, .provisional, .ephemeral:
            break
        case .notDetermined:
            do {
                let allowed = try await center.requestAuthorization(options: [.alert, .sound])
                guard allowed else {
                    return false
                }
            } catch {
                return false
            }
        case .denied:
            return false
        @unknown default:
            return false
        }

        let content = UNMutableNotificationContent()
        content.title = event.title
        content.body = event.body
        content.sound = .default

        let request = UNNotificationRequest(
            identifier: "tama-clod-\(event.deliveryKey)",
            content: content,
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: 0.1, repeats: false)
        )

        do {
            try await center.add(request)
            return true
        } catch {
            return false
        }
    }

    private func authorizationStatus(center: UNUserNotificationCenter) async -> UNAuthorizationStatus {
        await withCheckedContinuation { continuation in
            center.getNotificationSettings { settings in
                continuation.resume(returning: settings.authorizationStatus)
            }
        }
    }
}
