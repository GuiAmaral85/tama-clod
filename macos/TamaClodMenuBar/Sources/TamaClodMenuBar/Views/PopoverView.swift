import AppKit
import SwiftUI
import TamaClodCore

struct PopoverView: View {
    @ObservedObject var model: AppModel
    @AppStorage("tamaClod.notificationMode") private var notificationModeRaw = NotificationMode.appAnimated.rawValue
    @State private var highlight = false

    var body: some View {
        VStack(spacing: 14) {
            header
            petScreen
            stats
            notificationControls
            footer
        }
        .padding(16)
        .frame(width: 360)
        .background(.regularMaterial)
        .onAppear(perform: syncNotificationMode)
        .onChange(of: notificationModeRaw) { _ in
            syncNotificationMode()
        }
        .onChange(of: model.highlightID) { _ in
            pulseHighlight()
        }
    }

    private var header: some View {
        HStack {
            Circle()
                .fill(connectionColor)
                .frame(width: 8, height: 8)
            Text(model.connectionState.label)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
            Spacer()
            Text("TAMA CLOD")
                .font(.caption.monospaced().weight(.bold))
        }
    }

    private var petScreen: some View {
        VStack(spacing: 8) {
            PixelPetView(visual: model.visual)
                .frame(height: 210)
                .background(Color(red: 0.08, green: 0.07, blue: 0.10))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay {
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(highlight ? Color.orange : Color.orange.opacity(0.65), lineWidth: highlight ? 3 : 1)
                }

            Text(model.visual.label)
                .font(.caption.monospaced())
                .foregroundStyle(.secondary)
                .lineLimit(2)
                .multilineTextAlignment(.center)
                .frame(minHeight: 32)
        }
    }

    private var stats: some View {
        VStack(spacing: 8) {
            statRow("Stage", "\(model.petState?.stage ?? 0)")
            statRow("Energy", "\(Int((model.petState?.energy ?? 100).rounded()))%")
            statRow("Hunger", "\(Int((model.petState?.hunger ?? 0).rounded()))%")
            statRow("Growth", PetFormatters.tokens(model.petState?.growthTokens ?? 0))
            statRow("Idle", PetFormatters.idle(model.petState?.msSinceActivity))
        }
        .padding(12)
        .background(.thinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var notificationControls: some View {
        VStack(alignment: .leading, spacing: 8) {
            Picker("Notifications", selection: $notificationModeRaw) {
                ForEach(NotificationMode.allCases, id: \.rawValue) { mode in
                    Text(mode.title).tag(mode.rawValue)
                }
            }
            .pickerStyle(.segmented)

            if model.notificationPermissionDenied {
                Text("macOS notification permission is unavailable. Animated popover fallback is active.")
                    .font(.caption)
                    .foregroundStyle(.orange)
            }

            if let milestone = model.lastMilestone {
                Text("\(milestone.title): \(milestone.body)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
        }
    }

    private var footer: some View {
        HStack {
            Button("Refresh") {
                model.refresh()
            }
            Spacer()
            Button("Quit") {
                NSApp.terminate(nil)
            }
            .keyboardShortcut("q")
        }
    }

    private var connectionColor: Color {
        switch model.connectionState {
        case .connected:
            .green
        case .starting, .connecting:
            .yellow
        case .failed:
            .red
        case .disconnected:
            .secondary
        }
    }

    private func statRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label.uppercased())
                .font(.caption2.monospaced().weight(.semibold))
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .font(.caption.monospaced().weight(.bold))
        }
    }

    private func syncNotificationMode() {
        model.notificationMode = NotificationMode(rawValue: notificationModeRaw) ?? .appAnimated
    }

    private func pulseHighlight() {
        highlight = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            highlight = false
        }
    }
}
