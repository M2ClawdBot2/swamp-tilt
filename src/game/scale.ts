// Code mirror of SCALE.md — 1 world unit = 1 cm. If you change one, change both.

export const BALL_RADIUS = 1.35 // cm (standard 27 mm ball)
export const BALL_DENSITY = 7.8 // g/cm^3, steel

export const SLOPE_DEG = 6.5
export const GRAVITY = 981 // cm/s^2

export const DT = 1 / 240 // fixed physics timestep, s

export const WALL_HEIGHT = 3.0
export const GLASS_Y = 3.6

// Level strata (later gates)
export const LEVEL_Y = { plaza: 0, reitz: 40, bench: 80 } as const
