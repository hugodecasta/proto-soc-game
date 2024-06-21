import { rng } from "./planche_loader.js"
import { EventHandler, divfix } from "./vanille/components.js"

const dice_div = divfix().add2b().set_style({
    top: '', left: '', bottom: '20px', right: '20px',
    background: '#c0392b',
    color: '#fff',
    padding: '20px',
    width: '20px',
    height: '20px',
    opacity: 0.5,
    boxShadow: '0px 0px 10px #000',
    transition: 'all 0.2s',
}).add('?')

export const dice_event_handler = new EventHandler()

dice_div.addEventListener('click', () => dice_event_handler.trigger_event('roll'))


export function roll_dice() {
    const number = Math.floor(rng() * 6) + 1
    dice_div.clear()
    dice_div.add(number)
    dice_div.set_style({
        transform: 'rotate(1080deg)'
    })
    setTimeout(() => dice_div.set_style({ transform: 'rotate(0deg)' }), 200)
}