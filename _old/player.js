import { button, create_elm, div, divabs, divfix, listen_to, make_moveable } from "../vanille/components.js"

export function game_player(game_data) {

    let scale = 1

    const play_div = divfix().set_style({
        top: '10px', left: '10px',
        width: 'calc(100% - 20px)',
        height: 'calc(100% - 20px)',
        zIndex: 100,
        background: '#fff'
    })

    const planche = div().add2(play_div).set_style({
        position: 'absolute',
        top: '0px', left: '0px',
        transformOrigin: 'top left',
        transform: 'scale(' + scale + ')',
    })
    create_elm('img').add2(planche).set_attributes({ src: game_data.grid }).set_style({
        position: 'absolute',
        top: '0px', left: '0px',
        opacity: 0.7,
        pointerEvents: 'none',
        filter: 'saturation(0)'
    })

    window.addEventListener('wheel', (evt) => {
        scale -= evt.deltaY / 10000
    })

    listen_to(() => scale, () => planche.set_style({ transform: 'scale(' + scale + ')' }))

    pown_drawer(game_data, (piond) => {
        piond.add2(planche)
        piond.set_style({
            position: 'absolute',
            top: '0px', left: '0px',
            margin: '0px',
            boxShadow: '-5px 5px 10px rgba(0,0,0,0.8)',
        })
        make_moveable(piond, piond, { x: 0, y: 0 }, () => ({ x: 10, y: 10, scale }))

    }).add2(play_div)

    return play_div

}

function pown_drawer(game_data, clic_action) {

    let opened = true

    const drawer_div = div().set_style({
        position: 'fixed',
        bottom: '0px', left: '0px',
        background: '#fff',
        border: '1px solid #000',
        padding: '20px',
        maxWidth: '700px',
        zIndex: '1000'

    })

    const pown_list = []

    for (const pown_name in game_data.powns) {
        const image = game_data.powns[pown_name].versions.main
        const pown_div = div().add(create_elm('img').set_attributes({ src: image }).set_style({
            pointerEvents: 'none',
        })).set_style({
            display: 'inline-block',
            margin: '20px',
            top: '0px', left: '0px',
            boxShadow: '-5px 5px 10px rgba(0,0,0,0.8)',
        })
        pown_list.push(pown_div)
    }

    listen_to(() => opened, () => {

        drawer_div.clear()

        drawer_div.add(
            button('+-', () => opened = !opened)
        )

        if (!opened) return

        for (const pown_div of pown_list) {

            pown_div.add2(drawer_div)
            pown_div.onclick = () => {
                pown_div.onclick = null
                clic_action(pown_div)
            }
        }

    }, true)

    return drawer_div
}