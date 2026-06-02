import Foundation

public enum PetVisualMapper {
    private static let stageNames = ["EGG", "BABY", "CHILD", "TEEN", "ADULT"]

    public static func buildLive(from state: PetState) -> PetVisualConfig {
        buildLive(stage: state.stage, energy: state.energy, hunger: state.hunger)
    }

    public static func buildLive(
        stage: Int,
        energy: Double,
        hunger: Double
    ) -> PetVisualConfig {
        if stage == 0 {
            return PetVisualConfig(
                stage: 0,
                isEgg: true,
                body: .standard,
                eye: .neutral,
                glow: 0,
                bob: true,
                label: "EGG - waiting for first use"
            )
        }

        let name = stageNames.indices.contains(stage) ? stageNames[stage] : "STAGE \(stage)"
        var visual = PetVisualConfig(
            stage: stage,
            body: .standard,
            eye: .neutral,
            mouth: .none,
            accessories: [],
            squash: 1,
            tilt: 0,
            glow: energy / 130,
            bob: true,
            label: "\(name) - healthy"
        )

        if hunger > 75 {
            visual = PetVisualConfig(
                stage: stage,
                body: .tired,
                eye: .hungry,
                mouth: .open,
                accessories: [.tears],
                squash: 1,
                tilt: 0,
                glow: visual.glow,
                bob: false,
                label: "\(name) - starving"
            )
        } else if hunger > 45 {
            visual = PetVisualConfig(
                stage: stage,
                body: .standard,
                eye: .sleepy,
                mouth: .none,
                accessories: [],
                squash: 1,
                tilt: 0,
                glow: visual.glow,
                bob: true,
                label: "\(name) - hungry"
            )
        } else if hunger < 15 {
            visual = PetVisualConfig(
                stage: stage,
                body: .standard,
                eye: .happy,
                mouth: .none,
                accessories: [.hearts],
                squash: 1,
                tilt: 0,
                glow: visual.glow,
                bob: true,
                label: "\(name) - healthy"
            )
        }

        if energy > 85, hunger < 45 {
            visual = PetVisualConfig(
                stage: stage,
                body: .energized,
                eye: .wide,
                mouth: .none,
                accessories: [.sparkles],
                squash: 1,
                tilt: 0,
                glow: 1,
                bob: true,
                label: "\(name) - energized"
            )
        } else if energy < 12 {
            visual = PetVisualConfig(
                stage: stage,
                body: .tired,
                eye: .sleepy,
                mouth: .drool,
                accessories: [.sweat],
                squash: 0.7,
                tilt: -5,
                glow: 0,
                bob: false,
                label: "\(name) - exhausted"
            )
        } else if energy < 30 {
            visual = PetVisualConfig(
                stage: stage,
                body: .tired,
                eye: .sleepy,
                mouth: .none,
                accessories: [],
                squash: 0.85,
                tilt: 0,
                glow: 0,
                bob: false,
                label: "\(name) - tired"
            )
        }

        if isFainted(stage: stage, energy: energy, hunger: hunger) {
            return PetVisualConfig(
                stage: max(1, stage - 1),
                body: .sick,
                eye: .dead,
                mouth: .none,
                accessories: [],
                squash: 0.55,
                tilt: 10,
                glow: 0,
                bob: false,
                label: "FAINTED - take care of it"
            )
        }

        return visual
    }

    public static func isFainted(stage: Int, energy: Double, hunger: Double) -> Bool {
        stage > 0 && energy < 10 && hunger > 80
    }
}
