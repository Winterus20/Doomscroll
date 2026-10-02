import Decimal from 'break_eternity.js'
import { BASE_SHIFT_POWER } from '../../src/game/challenges.ts'

console.log('--- TEST 1: BASE_SHIFT_POWER ---')
console.log('BASE_SHIFT_POWER:', BASE_SHIFT_POWER)

console.log('\n--- TEST 2: SHIFT REQUIREMENTS ---')
for (let s = 0; s <= 8; s++) {
  let req
  if (s < 4) {
    const tier = 4 + s
    req = { tier, amount: 25 }
  } else {
    req = { tier: 8, amount: 20 + 15 * (s - 4) }
  }
  const packs = Math.ceil(req.amount / 10)
  // D8 base 1e24, costMult 1e15
  const cost = req.tier === 8 ? `~1e${24 + 15 * (packs - 1)} Dopamine` : 'Tier ' + req.tier
  console.log(`Shift ${s} -> ${s + 1}: requires ${req.amount} of D${req.tier} (${cost})`)
}

console.log('\n--- TEST 3: GALAXY REQUIREMENTS ---')
for (let g = 0; g <= 4; g++) {
  const normal = 40 + g * 20
  const c7 = Math.floor(normal * 1.5)
  console.log(`Galaxy ${g} -> ${g + 1}: Normal = ${normal} D8 (~1e${24 + 15 * (Math.ceil(normal / 10) - 1)} Dopamine), C7 = ${c7} D6 (~1e${13 + 10 * (Math.ceil(c7 / 10) - 1)} Dopamine)`)
}
