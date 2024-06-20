import { THREE_VIEWPORT } from "./THREE_VIEWPORT.js"
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import * as THREE from 'three'
import { br, button, div, divfix, h1, h3, listen_to, popup_pop } from "./vanille/components.js"
import { PLANCHE3D, load_planche, local_id_map } from "./planche_loader.js"
import { connect_session } from "./interconnect.js"
import { INTER_GAME } from "./intergame.js"
import { DATABASE } from "./vanille/db_sytem/database.js"

export function get_user_object() {
    const user_db = new DATABASE('service_courant_user', { user: null, color: null }, false)
    const user_data = user_db.object
    return user_data
}

function create_user_display(user_map) {

    const user_div = divfix().add2b().set_style({
        top: '0px',
        left: '0px',
        eventPointers: 'none',
        padding: '#000',
        opacity: 0.7,
        padding: '20px',
        zIndex: '1000000',
    })

    listen_to(() => user_map, () => {

        user_div.clear()

        for (const { data: user_data } of Object.values(user_map)) {
            const { color, user } = user_data
            user_div.add(
                div().set_style({
                    padding: '5px',
                    background: color,
                    marginRight: '10px',
                    display: 'inline-block'
                }),
                h3(user).set_style({
                    marginTop: '2px',
                    marginBottom: '5px',
                    display: 'inline-block'
                }),
                br()
            )
        }

    }, true)

}

export async function setup_game(session_code) {

    const planch = await new PLANCHE3D()

    create_user_display(planch.users)

    const user_data = get_user_object()

    const game = await new INTER_GAME(
        'game_service_courante_proto_' + session_code,
        // --------------------------------------------- WELCOME
        () => {
            while (!user_data.user) {
                user_data.user = prompt('User name')
            }
            while (!user_data.color) {
                user_data.color = prompt('User color (#... format)')
            }
            return user_data
        },
        ({ user, color }) => {
            planch.update_user(user, color, 0, 0, false)
        },
        // --------------------------------------------- GOODBYE
        () => ({ user: user_data.user }),
        ({ user }) => {
            planch.remove_user(user)
        },
        // --------------------------------------------- DATA HANDLER
        (topic, data) => {
            if (topic == 'obj') {
                const { id, position, rotation } = data
                if (id == moving) return
                planch.id_map[id].position.x = position.x
                planch.id_map[id].position.y = position.y
                planch.id_map[id].position.z = position.z
                planch.id_map[id].rotation.x = rotation._x
                planch.id_map[id].rotation.y = rotation._y
                planch.id_map[id].rotation.z = rotation._z
            }
            if (topic == 'mouse') {
                const { user, x, y } = data
                // if (user == user_data.user) return
                planch.update_user(user, null, x, y, true)
            }
            if (topic == 'user_pos') {
                let { user, cam_pos, tar_pos } = data
                if (user == user_data.user) {
                    cam_pos = { x: -1000, y: -1000, z: -1000 }
                }
                planch.update_user(user, null, null, null, null, { cam_pos, tar_pos })
            }
            if (topic == 'control') {
                const { user, control } = data
                // if (user == user_data.user) return
                planch.update_user(user, null, null, null, control)
            }
        }
    )

    let moving = null
    planch.addEventListener('obj', (evt) => {
        game.send_data('obj', JSON.parse(JSON.stringify((evt))), 'obj_' + evt.id)
    })
    planch.addEventListener('moving', (id) => {
        moving = id
    })
    planch.addEventListener('done', (id) => {
        moving = null
    })


    planch.addEventListener('mouse', ({ x, y }) => {
        game.send_data('mouse', { user: user_data.user, x, y }, 'mouse_' + user_data.user)
    })
    planch.addEventListener('in_control', () => {
        game.send_data('control', { user: user_data.user, control: true }, 'mouse_control_' + user_data.user)
    })
    planch.addEventListener('out_control', () => {
        game.send_data('control', { user: user_data.user, control: false }, 'mouse_control_' + user_data.user)
    })

    let past_move = null
    setInterval(() => {
        const camera = planch.vp3d.camera
        const pos_str = JSON.stringify(camera.position)
        if (pos_str == past_move) return

        game.send_data('user_pos', {
            user: user_data.user,
            cam_pos: camera.position,
            tar_pos: planch.vp3d.controls.target
        }, 'user_pos_' + user_data.user)

        past_move = pos_str
    }, 100)

}