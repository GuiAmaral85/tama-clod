import Foundation
import Testing
@testable import TamaClodCore

@Test func decodesPetStateFromServerPayload() throws {
    let json = """
    {
      "stage": 3,
      "isEgg": false,
      "growthTokens": 1234567,
      "energy": 87.5,
      "hunger": 12.25,
      "lastActivityTs": 1717344000000,
      "msSinceActivity": 120000
    }
    """

    let state = try JSONDecoder().decode(PetState.self, from: Data(json.utf8))

    #expect(state.stage == 3)
    #expect(state.isEgg == false)
    #expect(state.growthTokens == 1_234_567)
    #expect(state.energy == 87.5)
    #expect(state.hunger == 12.25)
    #expect(state.lastActivityTs == 1_717_344_000_000)
    #expect(state.msSinceActivity == 120_000)
}

@Test func mapsLiveStateToCriticalFaintedVisual() {
    let state = PetState(
        stage: 3,
        isEgg: false,
        growthTokens: 10_000_000,
        energy: 7,
        hunger: 92,
        lastActivityTs: 1,
        msSinceActivity: 2
    )

    let visual = PetVisualMapper.buildLive(from: state)

    #expect(visual.stage == 2)
    #expect(visual.eye == .dead)
    #expect(visual.body == .sick)
    #expect(visual.label == "FAINTED - take care of it")
}

@Test func formatsTokenAndIdleValuesForPopover() {
    #expect(PetFormatters.tokens(999) == "999")
    #expect(PetFormatters.tokens(12_400) == "12.4k")
    #expect(PetFormatters.tokens(2_500_000) == "2.50M")
    #expect(PetFormatters.idle(nil) == "never")
    #expect(PetFormatters.idle(30_000) == "just now")
    #expect(PetFormatters.idle(3_900_000) == "1 h 5 min")
}
