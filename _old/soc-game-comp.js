import { setup_image_paste } from "./paste_image.js"
import { game_player } from "./player.js"
import { br, button, create_elm, div, dynadiv, h1, h2, h3, hr, input, listen_to, popup_pop } from "../vanille/components.js"
import { DATABASE } from "../vanille/db_sytem/database.js"

// ---------------------------------------------------------------------------------------------------- INIT COMP

export function soc_game_comp(name) {

    // ------------------------------------------------------ DB

    const db = new DATABASE(`soc-game_${name}-db`, {
        name,
        rules: 'no rules',
        decks: {},
        powns: {},
        grid: null,
        setup: {
            decks: {},
            powns: {}
        }
    }, false)

    const soc_game = db.object
    console.log(soc_game)

    // ------------------------------------------------------ DIV

    const soc_game_div = div()

    // ------------------------------------------------------ DRAW

    draw_game(soc_game, soc_game_div)

    // ------------------------------------------------------ RET

    return soc_game_div

}

// ---------------------------------------------------------------------------------------------------- DRAW SOC GAME

function launch_play(game_data) {
    game_player(game_data).add2b()
}

function draw_game(game_object, game_div) {

    // ------------------------------------------------------ TITLES

    const play_button = button('PLAY', () => launch_play(game_object)).set_style({
        marginLeft: '30px', fontSize: '25px', fontWeight: 'bold'
    })

    game_div.add(h1('"' + game_object.name + '"', play_button), hr())

    // ------------------------------------------------------ RULES

    const rule_div = dynadiv(() => game_object.rules, function (rules) {

        this.add(h2('Rules'))

        this.add(
            input(rules, 'textarea', (data) => game_object.rules = data, false).set_style({
                width: '100%',
                maxWidth: '100%',
                minHeight: '100px'
            })
        )

    })

    // ------------------------------------------------------ GRID

    const grid_div = dynadiv(() => game_object.grid, function (grid) {

        this.add(hr(), h2('Grid'))

        this.add(button('set Grid', async () => {
            const image = await add_image_popup('Grid', grid)
            if (!image) return
            game_object.grid = image
        }))

        this.add(
            div().set_style({
                width: '100%',
                height: '200px',
                background: `url(${grid})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat'
            })
        )

    })

    // ------------------------------------------------------ DECKS

    const deck_div = dynadiv(() => game_object.decks, function (decks) {

        this.add(hr(), h2('Decks'))

        for (const deck_name in decks) {
            const deck_data = decks[deck_name]
            this.add(
                h3('- ' + deck_name),
                button('x', () => delete decks[deck_name])
            )
        }

    })

    // ------------------------------------------------------ POWNS

    const pown_div = dynadiv(() => game_object.powns, function (powns) {

        this.add(hr(), h2('Powns'))

        async function create_version(pown_name, version_name = null) {
            if (!version_name)
                version_name = prompt('version name')
            if (!version_name) return
            const image = await add_image_popup('Pown: ' + pown_name + '::' + version_name, powns[pown_name]?.versions?.[version_name])
            powns[pown_name].versions[version_name] = image
            if (!image) return
        }
        this.add(button('+ pown', async () => {

            const name = prompt('pown name')
            if (!name) return
            powns[name] = {
                number: 1,
                versions: {}
            }
            create_version(name, 'main')

        }), br())

        for (const pown_name in powns) {
            const pown_div = div().add2(this).set_style({
                width: 'fit-content',
                display: 'inline-block',
                border: '1px solid #aaa'
            })

            h3(pown_name, button('x', () => { delete powns[pown_name] }).set_style({ marginLeft: '10px' })).add2(pown_div)
            const inside = div().set_style({ paddingLeft: '50px' }).add2(pown_div)
            button('+ version', () => create_version(pown_name)).add2(inside)
            for (const version_name in powns[pown_name].versions) {
                h3(' - ' + version_name, button('x', () => { delete powns[pown_name].versions[version_name] })).add2(inside)
                div().set_style({
                    width: '32px',
                    height: '32px',
                    background: `url(${powns[pown_name].versions[version_name]})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat'
                }).add2(inside)
            }
        }

    })

    // ------------------------------------------------------ LAYOUT

    const layout = [
        [rule_div, rule_div, rule_div],
        [grid_div, deck_div, pown_div]
    ]

    const layout_div = div().set_style({
        display: 'grid',
        gridTemplateColumns: Array(layout[0].length).fill(0).map(() => '1fr').join(' '),
        gridTemplateRows: Array(layout.length).fill(0).map(() => 'auto').join(' '),
    }).add2(game_div)

    for (let i = 0; i < layout.length; ++i) {
        for (let j = 0; j < layout[i].length; ++j) {
            const elm = layout[i][j]
            const local_i = i + 1
            const local_j = j + 1
            elm.add2(layout_div)
            elm.start_row ??= local_i
            elm.end_row = local_i
            elm.start_column ??= local_j
            elm.end_column = local_j + 1
            elm.set_style({
                display: 'inline-block',
                'grid-column-start': elm.start_column,
                'grid-column-end': elm.end_column,
                'grid-row-start': elm.start_row,
                'grid-row-end': elm.end_row,
            })
        }
    }


}

// ---------------------------------------------------------------------------------------------------- UTILS

async function add_image_popup(name, pre_image) {


    const image_div = create_elm('img').set_style({
        maxWidth: '700px',
    }).set_attributes({ src: pre_image })

    let image = null

    const popup = div().add(
        h2(name),
        image_div,
    )

    setup_image_paste(popup, (image_data) => {
        image = image_data
        image_div.set_attributes({ src: image })
    })

    return popup_pop(popup, () => {
        return image
    })
}