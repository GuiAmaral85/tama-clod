import Foundation

public enum MilestoneEvent: Equatable, Sendable {
    case stageEvolved(from: Int, to: Int)
    case energyLow
    case energyCritical
    case energyRecovered
    case hungerHigh
    case hungerCritical
    case fainted

    public var deliveryKey: String {
        switch self {
        case .stageEvolved(_, let to):
            "stage:\(to)"
        case .energyLow:
            "energy:low"
        case .energyCritical:
            "energy:critical"
        case .energyRecovered:
            "energy:recovered"
        case .hungerHigh:
            "hunger:high"
        case .hungerCritical:
            "hunger:critical"
        case .fainted:
            "pet:fainted"
        }
    }

    public var title: String {
        switch self {
        case .stageEvolved:
            "TAMA CLOD evolved"
        case .energyLow:
            "TAMA CLOD is tired"
        case .energyCritical:
            "TAMA CLOD is exhausted"
        case .energyRecovered:
            "TAMA CLOD recovered energy"
        case .hungerHigh:
            "TAMA CLOD is hungry"
        case .hungerCritical:
            "TAMA CLOD is starving"
        case .fainted:
            "TAMA CLOD fainted"
        }
    }

    public var body: String {
        switch self {
        case .stageEvolved(let from, let to):
            "Stage \(from) -> \(to). Open the popover to see the new form."
        case .energyLow:
            "The token window is getting low."
        case .energyCritical:
            "Energy is nearly empty."
        case .energyRecovered:
            "Energy is back in a comfortable range."
        case .hungerHigh:
            "It has been a while since your last Claude Code session."
        case .hungerCritical:
            "It needs attention after a long idle stretch."
        case .fainted:
            "Energy and hunger are both critical."
        }
    }
}

public enum MilestoneDetector {
    public static func detect(previous: PetState?, current: PetState) -> [MilestoneEvent] {
        guard let previous else {
            return []
        }

        var events: [MilestoneEvent] = []

        if current.stage > previous.stage {
            events.append(.stageEvolved(from: previous.stage, to: current.stage))
        }

        if previous.energy >= 30, current.energy < 30 {
            events.append(.energyLow)
        }
        if previous.energy >= 12, current.energy < 12 {
            events.append(.energyCritical)
        }
        if previous.energy < 30, current.energy >= 50 {
            events.append(.energyRecovered)
        }

        if previous.hunger < 45, current.hunger >= 45 {
            events.append(.hungerHigh)
        }
        if previous.hunger < 75, current.hunger >= 75 {
            events.append(.hungerCritical)
        }

        let wasFainted = PetVisualMapper.isFainted(
            stage: previous.stage,
            energy: previous.energy,
            hunger: previous.hunger
        )
        let isFainted = PetVisualMapper.isFainted(
            stage: current.stage,
            energy: current.energy,
            hunger: current.hunger
        )
        if !wasFainted, isFainted {
            events.append(.fainted)
        }

        return events
    }
}

public struct MilestoneTracker: Sendable {
    private var deliveredKeys: Set<String> = []

    public init() {}

    public func shouldDeliver(_ event: MilestoneEvent) -> Bool {
        !deliveredKeys.contains(event.deliveryKey)
    }

    public mutating func markDelivered(_ event: MilestoneEvent) {
        deliveredKeys.insert(event.deliveryKey)
    }
}
