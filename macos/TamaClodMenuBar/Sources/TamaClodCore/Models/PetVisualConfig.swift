import Foundation

public enum PetBodyColor: String, Equatable, Sendable {
    case standard
    case energized
    case tired
    case sick
    case amber
}

public enum PetEyeStyle: String, Equatable, Sendable {
    case neutral
    case happy
    case sleepy
    case hungry
    case wide
    case sick
    case dizzy
    case dead
    case closed
}

public enum PetMouthStyle: String, Equatable, Sendable {
    case none
    case open
    case drool
    case wavy
}

public enum PetAccessory: String, Equatable, Sendable {
    case hearts
    case sparkles
    case sweat
    case tears
    case thermometer
    case zzz
    case evolve
    case crumbs
}

public struct PetVisualConfig: Equatable, Sendable {
    public let stage: Int
    public let isEgg: Bool
    public let cracks: Bool
    public let body: PetBodyColor
    public let eye: PetEyeStyle
    public let mouth: PetMouthStyle
    public let accessories: [PetAccessory]
    public let squash: Double
    public let tilt: Double
    public let glow: Double
    public let bob: Bool
    public let label: String

    public init(
        stage: Int,
        isEgg: Bool = false,
        cracks: Bool = false,
        body: PetBodyColor = .standard,
        eye: PetEyeStyle = .neutral,
        mouth: PetMouthStyle = .none,
        accessories: [PetAccessory] = [],
        squash: Double = 1,
        tilt: Double = 0,
        glow: Double = 0,
        bob: Bool = true,
        label: String
    ) {
        self.stage = stage
        self.isEgg = isEgg
        self.cracks = cracks
        self.body = body
        self.eye = eye
        self.mouth = mouth
        self.accessories = accessories
        self.squash = squash
        self.tilt = tilt
        self.glow = glow
        self.bob = bob
        self.label = label
    }
}
