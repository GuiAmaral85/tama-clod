import Testing
@testable import TamaClodCore

@Test func detectsRelevantMilestonesBetweenStates() {
    let previous = PetState(
        stage: 1,
        isEgg: false,
        growthTokens: 200_000,
        energy: 70,
        hunger: 20,
        lastActivityTs: 1,
        msSinceActivity: 1
    )
    let current = PetState(
        stage: 2,
        isEgg: false,
        growthTokens: 2_000_000,
        energy: 9,
        hunger: 81,
        lastActivityTs: 2,
        msSinceActivity: 2
    )

    let events = MilestoneDetector.detect(previous: previous, current: current)

    #expect(events.contains(.stageEvolved(from: 1, to: 2)))
    #expect(events.contains(.energyLow))
    #expect(events.contains(.energyCritical))
    #expect(events.contains(.hungerHigh))
    #expect(events.contains(.hungerCritical))
    #expect(events.contains(.fainted))
}

@Test func trackerDeduplicatesAlreadyDeliveredMilestones() {
    var tracker = MilestoneTracker()
    let event = MilestoneEvent.hungerCritical

    #expect(tracker.shouldDeliver(event) == true)
    tracker.markDelivered(event)
    #expect(tracker.shouldDeliver(event) == false)
}

@Test func trackerAllowsStageEvolutionForNewTargetStage() {
    var tracker = MilestoneTracker()

    tracker.markDelivered(.stageEvolved(from: 1, to: 2))

    #expect(tracker.shouldDeliver(.stageEvolved(from: 1, to: 2)) == false)
    #expect(tracker.shouldDeliver(.stageEvolved(from: 2, to: 3)) == true)
}
