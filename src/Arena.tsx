import { useEffect, useRef } from 'react'
import { Application, Container, Graphics } from 'pixi.js'
import { io, type Socket } from 'socket.io-client'

const VIEW_WIDTH = 800
const VIEW_HEIGHT = 600
const MAP_WIDTH = 2400
const MAP_HEIGHT = 1800
const BASE_RADIUS = 20
const FOOD_RADIUS = 5

type PlayerState = { id: string; x: number; y: number; radius: number }
type FoodState = { id: number; x: number; y: number }

export function Arena() {
    const socketRef = useRef<Socket | null>(null)
    const stateRef = useRef<PlayerState[]>([])
    const foodsRef = useRef(new Map<number, FoodState>())
    const pixiContainer = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const socket = io('http://localhost:3001')
        socketRef.current = socket

        socket.on('connect', () => {
            console.log('conectado ao servidor:', socket.id)
        })

        socket.on('state', (state: { players: PlayerState[] }) => {
            stateRef.current = state.players
        })

        socket.on('foods:init', (list: FoodState[]) => {
            foodsRef.current = new Map(list.map((f) => [f.id, f]))
        })

        socket.on('food:spawned', (f: FoodState) => {
            foodsRef.current.set(f.id, f)
        })

        socket.on('food:eaten', (id: number) => {
            foodsRef.current.delete(id)
        })

        return () => {
            socket.disconnect()
        }
    }, [])

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

            // grade de fundo
            const grid = new Graphics()
            for (let x = 0; x <= MAP_WIDTH; x += 100) grid.moveTo(x, 0).lineTo(x, MAP_HEIGHT)
            for (let y = 0; y <= MAP_HEIGHT; y += 100) grid.moveTo(0, y).lineTo(MAP_WIDTH, y)
            grid.stroke({ width: 1, color: 0x2a2a4a })
            grid.rect(0, 0, MAP_WIDTH, MAP_HEIGHT)
            grid.stroke({ width: 6, color: 0x5555aa })
            world.addChild(grid)

            const foodLayer = new Container()
            world.addChild(foodLayer)
            const foodSprites = new Map<number, Graphics>()

            const playersLayer = new Container()
            world.addChild(playersLayer)
            const sprites = new Map<string, Graphics>()

            app.stage.eventMode = 'static'
            app.stage.hitArea = app.screen
            app.stage.on('pointermove', (e) => {
                socketRef.current?.emit('input', {
                    dx: e.global.x - VIEW_WIDTH / 2,
                    dy: e.global.y - VIEW_HEIGHT / 2,
                })
            })

            app.ticker.add((ticker) => {
                const t = 1 - Math.exp(-ticker.deltaMS / 50)   // suavização independente de FPS


                // comida: cria o desenho das novas
                for (const [id, f] of foodsRef.current) {
                    if (!foodSprites.has(id)) {
                        const sprite = new Graphics()
                        sprite.circle(0, 0, FOOD_RADIUS)
                        sprite.fill(0xff5577)
                        sprite.x = f.x
                        sprite.y = f.y
                        foodLayer.addChild(sprite)
                        foodSprites.set(id, sprite)
                    }
                }

                // comida: remove o desenho das que sumiram
                for (const [id, sprite] of foodSprites) {
                    if (!foodsRef.current.has(id)) {
                        foodLayer.removeChild(sprite)
                        sprite.destroy()
                        foodSprites.delete(id)
                    }
                }

                const players = stateRef.current
                const myId = socketRef.current?.id

                // jogadores: cria ou atualiza
                for (const p of players) {
                    let sprite = sprites.get(p.id)

                    if (!sprite) {
                        sprite = new Graphics()
                        sprite.circle(0, 0, BASE_RADIUS)
                        sprite.fill(p.id === myId ? 0x00ff88 : 0x4488ff)
                        sprite.x = p.x   // nasce já na posição certa
                        sprite.y = p.y
                        playersLayer.addChild(sprite)
                        sprites.set(p.id, sprite)
                    }

                    sprite.x += (p.x - sprite.x) * t
                    sprite.y += (p.y - sprite.y) * t
                    sprite.scale.set(sprite.scale.x + (p.radius / BASE_RADIUS - sprite.scale.x) * t)
                }

                // jogadores: remove quem saiu
                const alive = new Set(players.map((p) => p.id))
                for (const [id, sprite] of sprites) {
                    if (!alive.has(id)) {
                        playersLayer.removeChild(sprite)
                        sprite.destroy()
                        sprites.delete(id)
                    }
                }

                // câmera segue o meu círculo
                const me = myId ? sprites.get(myId) : undefined
                if (me) {
                    world.x = VIEW_WIDTH / 2 - me.x
                    world.y = VIEW_HEIGHT / 2 - me.y
                }
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