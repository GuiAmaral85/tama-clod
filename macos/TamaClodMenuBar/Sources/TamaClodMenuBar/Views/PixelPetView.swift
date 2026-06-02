import SwiftUI
import TamaClodCore

struct PixelPetView: View {
    let visual: PetVisualConfig
    @State private var bob = false

    var body: some View {
        Canvas { context, size in
            drawPet(in: &context, size: size)
        }
        .offset(y: visual.bob && bob ? -2 : 0)
        .animation(.easeInOut(duration: 0.55).repeatForever(autoreverses: true), value: bob)
        .onAppear {
            bob = true
        }
    }

    private func drawPet(in context: inout GraphicsContext, size: CGSize) {
        let scale = floor(min(size.width / 44, size.height / 40))
        let origin = CGPoint(
            x: (size.width - 44 * scale) / 2 + 22 * scale,
            y: (size.height - 40 * scale) / 2 + 20 * scale
        )

        func px(_ x: Double, _ y: Double, _ w: Double = 1, _ h: Double = 1, _ color: Color, _ opacity: Double = 1) {
            let rect = CGRect(
                x: origin.x + x * scale,
                y: origin.y + y * scale,
                width: w * scale,
                height: h * scale
            )
            var path = Path()
            path.addRect(rect)
            context.opacity = opacity
            context.fill(path, with: .color(color))
            context.opacity = 1
        }

        if visual.glow > 0 {
            px(-18, -16, 36, 32, bodyColor.opacity(0.22 * visual.glow))
        }

        if visual.isEgg {
            drawEgg(px: px)
        } else {
            drawCreature(px: px)
        }
    }

    private func drawEgg(px: (Double, Double, Double, Double, Color, Double) -> Void) {
        let rows: [(Double, Double)] = [
            (-9, 4), (-8, 6), (-7, 8), (-6, 10), (-5, 10), (-4, 10),
            (-3, 10), (-2, 10), (-1, 10), (0, 10), (1, 8), (2, 6)
        ]

        for (index, row) in rows.enumerated() {
            let color = index < 2 ? topColor : bodyColor
            px(-row.1 / 2, row.0, row.1, 1, color, 1)
        }

        px(-3, -3, 1, 2, .black, 0.45)
        px(2, -3, 1, 2, .black, 0.45)

        if visual.cracks {
            for point in [(-4, -5), (-3, -4), (-3, -3), (-2, -2), (-2, -1), (-1, 0), (0, 0), (0, 1)] {
                px(Double(point.0), Double(point.1), 1, 1, .black, 1)
            }
        }
    }

    private func drawCreature(px: (Double, Double, Double, Double, Color, Double) -> Void) {
        let geometry = creatureGeometry(stage: visual.stage)
        let bx = -Double(Int((geometry.width / 2).rounded()))
        let by = -Double(Int((geometry.height / 2).rounded())) - 1
        let right = bx + geometry.width
        let leftEye = bx + 2
        let rightEye = bx + geometry.width - 3
        let eyeY = by + 2

        px(bx, by, geometry.width, geometry.height * visual.squash, bodyColor, 1)
        px(bx, by, geometry.width, 1, topColor, 1)
        px(right - 4, by - 1, 2, 1, topColor, 1)
        px(bx - 1, by + (geometry.height * 0.45).rounded(), 1, 1, bodyColor, 1)
        px(right, by + (geometry.height * 0.45).rounded(), 1, 1, bodyColor, 1)

        for index in 0..<geometry.legs {
            let span = geometry.width - 2
            let offset = geometry.legs == 1 ? 0.5 : Double(index) / Double(geometry.legs - 1)
            let x = bx + 1 + Double(Int(((span - 1) * offset).rounded()))
            px(x, by + geometry.height * visual.squash, 1, 2, bodyColor, 1)
        }

        drawEyes(style: visual.eye, leftX: leftEye, rightX: rightEye, y: eyeY, px: px)
        drawMouth(style: visual.mouth, centerX: ((leftEye + rightEye) / 2).rounded(), y: eyeY + 3, px: px)
        drawAccessories(bounds: (left: bx, right: right, top: by, bottom: by + geometry.height, center: ((bx + right) / 2).rounded()), px: px)
    }

    private func drawEyes(
        style: PetEyeStyle,
        leftX: Double,
        rightX: Double,
        y: Double,
        px: (Double, Double, Double, Double, Color, Double) -> Void
    ) {
        func eye(_ x: Double, _ parts: [(Double, Double, Double, Double, Color?)]) {
            for part in parts {
                px(x + part.0, y + part.1, part.2, part.3, part.4 ?? .black, 1)
            }
        }

        switch style {
        case .happy:
            eye(leftX, [(-1, 1, 1, 1, nil), (0, 0, 1, 1, nil), (1, 1, 1, 1, nil)])
            eye(rightX, [(-1, 1, 1, 1, nil), (0, 0, 1, 1, nil), (1, 1, 1, 1, nil)])
        case .sleepy, .closed:
            eye(leftX, [(-1, 1, 3, 1, nil)])
            eye(rightX, [(-1, 1, 3, 1, nil)])
        case .dead, .dizzy:
            let xParts: [(Double, Double, Double, Double, Color?)] = [(-1, 0, 1, 1, nil), (1, 0, 1, 1, nil), (0, 1, 1, 1, nil), (-1, 2, 1, 1, nil), (1, 2, 1, 1, nil)]
            eye(leftX, xParts)
            eye(rightX, xParts)
        case .hungry:
            eye(leftX, [(-1, 0, 3, 3, Color.white), (0, 1, 1, 1, nil), (1, 0, 1, 1, Color.white)])
            eye(rightX, [(-1, 0, 3, 3, Color.white), (0, 1, 1, 1, nil), (1, 0, 1, 1, Color.white)])
        case .wide:
            eye(leftX, [(-1, 0, 3, 3, nil), (0, 0, 1, 1, Color.white)])
            eye(rightX, [(-1, 0, 3, 3, nil), (0, 0, 1, 1, Color.white)])
        case .sick:
            eye(leftX, [(-1, -1, 3, 1, nil), (0, 0, 1, 1, nil)])
            eye(rightX, [(-1, -1, 3, 1, nil), (0, 0, 1, 1, nil)])
        case .neutral:
            eye(leftX, [(0, 0, 1, 2, nil)])
            eye(rightX, [(0, 0, 1, 2, nil)])
        }
    }

    private func drawMouth(
        style: PetMouthStyle,
        centerX: Double,
        y: Double,
        px: (Double, Double, Double, Double, Color, Double) -> Void
    ) {
        switch style {
        case .none:
            break
        case .open:
            px(centerX - 1, y, 2, 2, .black, 1)
        case .drool:
            px(centerX - 1, y, 2, 1, .black, 1)
            px(centerX + 1, y, 1, 2, .cyan, 1)
        case .wavy:
            px(centerX - 2, y, 1, 1, .black, 1)
            px(centerX - 1, y + 1, 1, 1, .black, 1)
            px(centerX, y, 1, 1, .black, 1)
            px(centerX + 1, y + 1, 1, 1, .black, 1)
        }
    }

    private func drawAccessories(
        bounds: (left: Double, right: Double, top: Double, bottom: Double, center: Double),
        px: (Double, Double, Double, Double, Color, Double) -> Void
    ) {
        for accessory in visual.accessories {
            switch accessory {
            case .hearts:
                px(bounds.right + 3, bounds.top - 3, 1, 1, .pink, 1)
                px(bounds.right + 5, bounds.top - 3, 1, 1, .pink, 1)
                px(bounds.right + 2, bounds.top - 2, 5, 1, .pink, 1)
                px(bounds.right + 3, bounds.top - 1, 3, 1, .pink, 1)
                px(bounds.right + 4, bounds.top, 1, 1, .pink, 1)
            case .sparkles, .evolve:
                for point in [(bounds.left - 2, bounds.top), (bounds.right + 3, bounds.top + 1), (bounds.right + 2, bounds.bottom - 1), (bounds.left - 3, bounds.bottom - 2)] {
                    px(point.0, point.1, 1, 1, .yellow, 1)
                    px(point.0 - 1, point.1, 1, 1, .yellow, 1)
                    px(point.0 + 1, point.1, 1, 1, .yellow, 1)
                    px(point.0, point.1 - 1, 1, 1, .yellow, 1)
                    px(point.0, point.1 + 1, 1, 1, .yellow, 1)
                }
            case .sweat:
                px(bounds.right + 1, bounds.top + 1, 1, 2, .cyan, 1)
                px(bounds.right, bounds.top + 3, 3, 1, .cyan, 1)
            case .tears:
                px(bounds.left + 2, bounds.top + 3, 1, 2, .cyan, 1)
                px(bounds.right - 2, bounds.top + 3, 1, 2, .cyan, 1)
            case .thermometer:
                px(bounds.right, bounds.top, 1, 4, .white, 1)
                px(bounds.right - 1, bounds.top + 4, 3, 2, .red, 1)
            case .zzz:
                px(bounds.right + 1, bounds.top - 4, 3, 1, .gray, 1)
                px(bounds.right + 2, bounds.top - 3, 1, 1, .gray, 1)
                px(bounds.right + 1, bounds.top - 2, 3, 1, .gray, 1)
            case .crumbs:
                px(bounds.left + 1, bounds.bottom + 1, 1, 1, topColor, 1)
                px(bounds.right - 1, bounds.bottom + 1, 1, 1, topColor, 1)
                px(bounds.center, bounds.bottom + 2, 1, 1, topColor, 1)
            }
        }
    }

    private func creatureGeometry(stage: Int) -> (width: Double, height: Double, legs: Int) {
        switch stage {
        case 1:
            (8, 5, 2)
        case 2:
            (10, 6, 3)
        case 3:
            (12, 6, 3)
        default:
            (14, 7, 4)
        }
    }

    private var bodyColor: Color {
        switch visual.body {
        case .standard:
            Color(red: 0.78, green: 0.42, blue: 0.28)
        case .energized:
            Color(red: 0.90, green: 0.58, blue: 0.38)
        case .tired:
            Color(red: 0.62, green: 0.39, blue: 0.28)
        case .sick:
            Color(red: 0.55, green: 0.54, blue: 0.35)
        case .amber:
            Color(red: 0.91, green: 0.64, blue: 0.24)
        }
    }

    private var topColor: Color {
        switch visual.body {
        case .standard, .tired, .sick:
            Color(red: 0.64, green: 0.31, blue: 0.18)
        case .energized, .amber:
            Color(red: 0.78, green: 0.42, blue: 0.22)
        }
    }
}
