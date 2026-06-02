import AppKit
import SwiftUI
import TamaClodCore

@MainActor
final class StatusItemController: NSObject, AnimatedMilestonePresenting {
    private let model: AppModel
    private let statusItem: NSStatusItem
    private let popover: NSPopover

    init(model: AppModel) {
        self.model = model
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        popover = NSPopover()
        super.init()
        configureStatusItem()
        configurePopover()
    }

    func presentAnimatedMilestone(_ event: MilestoneEvent) {
        model.lastMilestone = event
        model.highlightID = UUID()
        showPopover()
    }

    @objc private func togglePopover() {
        if popover.isShown {
            popover.performClose(nil)
        } else {
            showPopover()
        }
    }

    private func configureStatusItem() {
        guard let button = statusItem.button else {
            return
        }

        button.image = NSImage(systemSymbolName: "pawprint.fill", accessibilityDescription: "TAMA CLOD")
        button.title = button.image == nil ? "TC" : ""
        button.toolTip = "TAMA CLOD"
        button.target = self
        button.action = #selector(togglePopover)
    }

    private func configurePopover() {
        popover.behavior = .transient
        popover.animates = true
        popover.contentSize = NSSize(width: 360, height: 520)
        popover.contentViewController = NSHostingController(rootView: PopoverView(model: model))
    }

    private func showPopover() {
        guard let button = statusItem.button else {
            return
        }

        if !popover.isShown {
            popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
        }
        popover.contentViewController?.view.window?.makeKey()
    }
}
