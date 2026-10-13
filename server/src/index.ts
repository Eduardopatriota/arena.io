import { Server } from 'socket.io'

const PORT = 3001
const MAP_WIDTH = 2400
const MAP_HEIGHT = 1800
const BASE_RADIUS = 20
const SPEED = 300 // pixels por segundo
const TICK_RATE = 30 // atualizações por segundo
const FOOD_COUNT = 150
const FOOD_RADIUS = 5
const GROWTH_PER_FOOD = 0.5

type Player = {
  id: string
  x: number
  y: number
  radius: number
  dirX: number
  dirY: number
}

type Food = { id: number; x: number; y: number }

const players = new Map<string, Player>()
const foods = new Map<number, Food>()
let nextFoodId = 0

const spawnFood = (): Food => {
  const food: Food = {
    id: nextFoodId++,
    x: FOOD_RADIUS + Math.random() * (MAP_WIDTH - FOOD_RADIUS * 2),
    y: FOOD_RADIUS + Math.random() * (MAP_HEIGHT - FOOD_RADIUS * 2),
  }
  foods.set(food.id, food)
  return food
}

for (let i = 0; i < FOOD_COUNT; i++) {
  spawnFood()
}

const io = new Server(PORT, {
  cors: { origin: 'http://localhost:5173' },
})

io.on('connection', (socket) => {
  players.set(socket.id, {
    id: socket.id,
    x: MAP_WIDTH / 2,
    y: MAP_HEIGHT / 2,
    radius: BASE_RADIUS,
    dirX: 0,
    dirY: 0,
  })
  console.log(`conectou: ${socket.id} (jogadores: ${players.size})`)

  // lista completa de comida, só para quem acabou de entrar
  socket.emit('foods:init', Array.from(foods.values()))

  socket.on('input', (data: { dx: number; dy: number }) => {
    const player = players.get(socket.id)
    if (!player) return
    if (typeof data?.dx !== 'number' || typeof data?.dy !== 'number') return
    player.dirX = data.dx
    player.dirY = data.dy
  })

  socket.on('disconnect', (reason) => {
    players.delete(socket.id)
    console.log(`desconectou: ${socket.id} - ${reason} (jogadores: ${players.size})`)
  })
})

setInterval(() => {
  const dt = 1 / TICK_RATE

  for (const p of players.values()) {
    // movimento
    const distance = Math.hypot(p.dirX, p.dirY)

    if (distance >= 1) {
      const step = Math.min(SPEED * dt, distance)
      p.x += (p.dirX / distance) * step
      p.y += (p.dirY / distance) * step
    }

    p.x = Math.max(p.radius, Math.min(MAP_WIDTH - p.radius, p.x))
    p.y = Math.max(p.radius, Math.min(MAP_HEIGHT - p.radius, p.y))

    // colisão com comida
    for (const food of Array.from(foods.values())) {
      if (Math.hypot(food.x - p.x, food.y - p.y) < p.radius) {
        foods.delete(food.id)
        p.radius += GROWTH_PER_FOOD
        io.emit('food:eaten', food.id)
        io.emit('food:spawned', spawnFood())
      }
    }
  }

  io.emit('state', {
    players: Array.from(players.values()).map(({ id, x, y, radius }) => ({ id, x, y, radius })),
  })
}, 1000 / TICK_RATE)

console.log(`servidor rodando na porta ${PORT}`)