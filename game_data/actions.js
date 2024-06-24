import { br, button, div, from_table, h1, h2, h3, hr, span } from "../vanille/components.js"

const actions_data = await (await fetch('/game_data/actions.json')).json()

for (const name in actions_data) {

    button(name, () => {
        show_actions(name)
    }).add2b()

}

hr().add2b()
hr().add2b()

const action_div = div().add2b().add('Sélectionner un role afin de voir ses actions')

function local_personnel_comp([local, personnel]) {
    console.log(personnel)
    return div().add(
        h3("<u>" + local + "</u>").set_style({ margin: '0px' }),
        div().set_style({ marginLeft: '10px' }).add(
            ...personnel.map(p => div('', p))
        ),
    )
}

function succes_comp(success) {
    if (!success) return null
    return from_table(
        Object.entries(success).map(([cas, tirage]) => [

            h3(cas).set_style({ margin: '0px', display: 'inline-block', textAlign: 'right', width: '100%' }),

            span().add(
                div().set_style({ padding: '5px', marginLeft: '10px', background: 'red', display: 'inline-block', width: 'inline-block' }),
                ...Array(6).fill(0).map((_, i) => span(i + 1).set_style({ opacity: tirage.includes(i + 1) ? 1 : 0.1, marginLeft: '10px', }))
            )

        ])
    )
}

function show_actions(name) {
    action_div.clear()

    const actions = actions_data[name]

    action_div.add(h1(name), hr())

    for (const action of actions) {
        const { name, requirement, personel, success, effect } = action
        div().add2(action_div).add(

            h2(name),

            div().set_style({ marginLeft: '30px' }).add(...[

                requirement ? div().add('- <u><b>Prérequis</b></u> :: ' + requirement) : null,

                br(),
                '- <u><b>Locaux</b></u>',
                div().add(...Object.entries(personel).map(local_personnel_comp)).set_style({
                    border: '1px solid #fff',
                    width: 'fit-content',
                    padding: "10px"
                }),

                br(),

                success ? div().add(
                    br(),
                    '- <u><b>Réussite</b></u>',
                    succes_comp(success).set_style({ marginLeft: '30px' }),
                    br(),
                ) : null,

                br(),

                div().add(
                    '- <u><b>Effet</b></u> :: ' + effect
                ),

            ].filter(e => e)),

            hr().set_style({ opacity: 0.2 })
        )
    }

}

show_actions('CDT')