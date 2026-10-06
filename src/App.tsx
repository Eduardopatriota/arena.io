import { useState } from 'react'
import { useEffect, useRef } from 'react'
import './App.css'
import { Application, Graphics, Text } from 'pixi.js'
import { Arena } from './Arena'

function App() {
  const pixiContainer = useRef<HTMLDivElement>(null)
  const crashPoint = 1 + Math.random() * 5 // entre 1.00x e 6.00x, por enquanto
  const multiplierRef = useRef(1)

  const handleCashOut = () => {
    if (round.status !== 'running') return
    setRound({ status: 'cashed-out', value: multiplierRef.current })
  }

  type RoundState =
    | { status: 'running' }
    | { status: 'cashed-out'; value: number }
    | { status: 'crashed'; value: number }

  const [round, setRound] = useState<RoundState>({ status: 'running' })




  return (
    <>
      <Arena />
  

    </>
  )
}

export default App
