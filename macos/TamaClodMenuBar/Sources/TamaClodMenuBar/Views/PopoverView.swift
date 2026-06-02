import AppKit
import SwiftUI
import TamaClodCore

struct PopoverView: View {
    @ObservedObject var model: AppModel
    @AppStorage("tamaClod.notificationMode") private var notificationModeRaw = NotificationMode.appAnimated.rawValue
    @State private var highlight = false

    var body: some View {
        Group {
            if #available(macOS 26.0, *) {
                liquidGlassBody
            } else {
                fallbackBody
            }
        }
        .onAppear(perform: syncNotificationMode)
        .onChange(of: notificationModeRaw) { _ in
            syncNotificationMode()
        }
        .onChange(of: model.highlightID) { _ in
            pulseHighlight()
        }
    }

    @available(macOS 26.0, *)
    private var liquidGlassBody: some View {
        GlassEffectContainer(spacing: 14) {
            content
        }
        .padding(16)
        .frame(width: 372)
    }

    private var fallbackBody: some View {
        content
            .padding(16)
            .frame(width: 360)
            .background(.regularMaterial)
    }

    private var content: some View {
        VStack(spacing: 14) {
            header
            petScreen
            stats
            notificationControls
            footer
        }
    }

    private var header: some View {
        HStack {
            liquidSurface(cornerRadius: 16, tint: connectionColor.opacity(0.16)) {
                HStack(spacing: 7) {
                    Circle()
                        .fill(connectionColor)
                        .frame(width: 8, height: 8)
                    Text(model.connectionState.label)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 7)
            }

            Spacer()

            liquidSurface(cornerRadius: 16) {
                Text("TAMA CLOD")
                    .font(.caption.monospaced().weight(.bold))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 7)
            }
        }
    }

    private var petScreen: some View {
        liquidSurface(cornerRadius: 18, tint: Color.orange.opacity(highlight ? 0.22 : 0.08)) {
            VStack(spacing: 10) {
                PixelPetView(visual: model.visual)
                    .frame(height: 210)
                    .background {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color(red: 0.08, green: 0.07, blue: 0.10))
                    }
                    .overlay {
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(highlight ? Color.orange : Color.orange.opacity(0.55), lineWidth: highlight ? 3 : 1)
                    }

                Text(model.visual.label)
                    .font(.caption.monospaced())
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                    .frame(minHeight: 32)
            }
            .padding(10)
        }
    }

    private var stats: some View {
        liquidSurface(cornerRadius: 16) {
            VStack(spacing: 8) {
                statRow("Stage", "\(model.petState?.stage ?? 0)")
                statRow("Energy", "\(Int((model.petState?.energy ?? 100).rounded()))%")
                statRow("Hunger", "\(Int((model.petState?.hunger ?? 0).rounded()))%")
                statRow("Growth", PetFormatters.tokens(model.petState?.growthTokens ?? 0))
                statRow("Idle", PetFormatters.idle(model.petState?.msSinceActivity))
            }
            .padding(12)
        }
    }

    private var notificationControls: some View {
        liquidSurface(cornerRadius: 16, interactive: true) {
            VStack(alignment: .leading, spacing: 10) {
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
            .padding(12)
        }
    }

    private var footer: some View {
        HStack {
            liquidButton("Refresh", prominent: true) {
                model.refresh()
            }
            Spacer()
            liquidButton("Quit") {
                NSApp.terminate(nil)
            }
            .keyboardShortcut("q")
        }
    }

    @ViewBuilder
    private func liquidButton(
        _ title: String,
        prominent: Bool = false,
        action: @escaping () -> Void
    ) -> some View {
        if #available(macOS 26.0, *) {
            if prominent {
                Button(title, action: action)
                    .buttonStyle(.glassProminent)
                    .controlSize(.regular)
            } else {
                Button(title, action: action)
                    .buttonStyle(.glass)
                    .controlSize(.regular)
            }
        } else {
            if prominent {
                Button(title, action: action)
                    .buttonStyle(.borderedProminent)
                    .controlSize(.regular)
            } else {
                Button(title, action: action)
                    .buttonStyle(.bordered)
                    .controlSize(.regular)
            }
        }
    }

    @ViewBuilder
    private func liquidSurface<Content: View>(
        cornerRadius: CGFloat,
        tint: Color? = nil,
        interactive: Bool = false,
        @ViewBuilder content: () -> Content
    ) -> some View {
        if #available(macOS 26.0, *) {
            if interactive {
                content()
                    .glassEffect(.regular.tint(tint).interactive(), in: .rect(cornerRadius: cornerRadius))
            } else {
                content()
                    .glassEffect(.regular.tint(tint), in: .rect(cornerRadius: cornerRadius))
            }
        } else {
            content()
                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: cornerRadius))
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
