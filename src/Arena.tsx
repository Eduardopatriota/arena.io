import { useEffect, useRef } from 'react'
import { Application, Container, Graphics } from 'pixi.js'

const VIEW_WIDTH = 800
const VIEW_HEIGHT = 600
const MAP_WIDTH = 2400
const MAP_HEIGHT = 1800
const BASE_RADIUS = 20
const FOOD_COUNT = 150
const FOOD_RADIUS = 5
const GROWTH_PER_FOOD = 0.5
const SPEED = 5



export function Arena() {
    const pixiContainer = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const app = new Application()
        let cancelled = false
        let ready = false

        const setup = async () => {
           await app.init({ width: VIEW_WIDTH, height: VIEW_HEIGHT, backgroundColor: 0x1a1a2e })

            if (cancelled) {
                app.destroy(true, { children: true })
                return
            }

            ready = true
            pixiContainer.current?.appendChild(app.canvas)

            const world = new Container()
            app.stage.addChild(world)

            // grade de fundo: sem ela não dá para perceber o movimento da câmera
            const grid = new Graphics()
            for (let x = 0; x <= MAP_WIDTH; x += 100) grid.moveTo(x, 0).lineTo(x, MAP_HEIGHT)
            for (let y = 0; y <= MAP_HEIGHT; y += 100) grid.moveTo(0, y).lineTo(MAP_WIDTH, y)
            grid.stroke({ width: 1, color: 0x2a2a4a })
            grid.rect(0, 0, MAP_WIDTH, MAP_HEIGHT)
            grid.stroke({ width: 6, color: 0x5555aa })
            world.addChild(grid)

            // camada só da comida, para ela ficar sempre entre a grade e o jogador
            const foodLayer = new Container()
            world.addChild(foodLayer)

            const foods: Graphics[] = []

            const spawnFood = () => {
                const food = new Graphics()
                food.circle(0, 0, FOOD_RADIUS)
                food.fill(0xff5577)
                food.x = FOOD_RADIUS + Math.random() * (MAP_WIDTH - FOOD_RADIUS * 2)
                food.y = FOOD_RADIUS + Math.random() * (MAP_HEIGHT - FOOD_RADIUS * 2)
                foodLayer.addChild(food)
                foods.push(food)
            }

            for (let i = 0; i < FOOD_COUNT; i++) {
                spawnFood()
            }

            const player = new Graphics()
            player.circle(0, 0, BASE_RADIUS)
            player.fill(0x00ff88)
            player.x = MAP_WIDTH / 2
            player.y = MAP_HEIGHT / 2
            world.addChild(player)

            let radius = BASE_RADIUS

            // posição do mouse em coordenadas de TELA
            const mouse = { x: VIEW_WIDTH / 2, y: VIEW_HEIGHT / 2 }

            app.stage.eventMode = 'static'
            app.stage.hitArea = app.screen
            app.stage.on('pointermove', (e) => {
                mouse.x = e.global.x
                mouse.y = e.global.y
            })

            app.ticker.add((ticker) => {
                // converte tela -> mundo
                const targetX = mouse.x - world.x
                const targetY = mouse.y - world.y

                const dx = targetX - player.x
                const dy = targetY - player.y
                const distance = Math.hypot(dx, dy)

                if (distance >= 1) {
                    const step = Math.min(SPEED * ticker.deltaTime, distance)
                    player.x += (dx / distance) * step
                    player.y += (dy / distance) * step
                }

                player.x = Math.max(radius, Math.min(MAP_WIDTH - radius, player.x))
                player.y = Math.max(radius, Math.min(MAP_HEIGHT - radius, player.y))

                for (let i = foods.length - 1; i >= 0; i--) {
                    const food = foods[i]
                    const d = Math.hypot(food.x - player.x, food.y - player.y)

                    if (d < radius) {
                        foodLayer.removeChild(food)
                        food.destroy()
                        foods.splice(i, 1)
                        spawnFood()
                        radius += GROWTH_PER_FOOD
                        player.scale.set(radius / BASE_RADIUS)
                    }
                }

                // câmera: coloca o jogador no centro da tela
                world.x = VIEW_WIDTH / 2 - player.x
                world.y = VIEW_HEIGHT / 2 - player.y
            })
        }

     
        setup()

        return () => {
            cancelled = true
            if (ready) {
                app.destroy(true, { children: true })
            }
        }
    }, [])

    return <div ref={pixiContainer} />
}
