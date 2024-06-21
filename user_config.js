import { get_user_object, setup_game } from "./game_setup.js"
import { br, button, div, divabs, h1, h3, input } from "./vanille/components.js"
import { DATABASE } from "./vanille/db_sytem/database.js"

const user_data = get_user_object()

export const session_db = new DATABASE('service_courant_session_db', { session_code: null })

export function create_user_config_panel() {

    const setup_div = div().set_style({ margin: 'auto', width: 'fit-content', textAlign: 'center' }).add(

        h1('===< Service Courant >==='),

        br(), br(), br(),

        h3('User name'),
        input(user_data.user, 'text', (u) => user_data.user = u),

        br(), br(), br(),

        h3('User color'),
        input(user_data.color, 'color', (c) => user_data.color = c),

        br(), br(), br(),

        h3('Game Session CODE'),
        input(session_db.object.session_code, 'text', (gid) => session_db.object.session_code = gid),

        br(), br(), br(),

        button(h1('>>> PLAY <<<'), () => {

            setup_div.remove()
            setup_game(session_db.object.session_code)

        })

    )
    return setup_div
}