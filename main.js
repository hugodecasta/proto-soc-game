import { THREE_VIEWPORT } from "./THREE_VIEWPORT.js"
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import * as THREE from 'three'
import { button, div, h1, popup_pop } from "./vanille/components.js"
import { PLANCHE3D, load_planche, local_id_map } from "./planche_loader.js"
import { connect_session } from "./interconnect.js"
import { INTER_GAME } from "./intergame.js"
import { DATABASE } from "./vanille/db_sytem/database.js"


const planch = await new PLANCHE3D()

const user_db = new DATABASE('service_courant_user', { user: null, color: null }, false)
const user_data = user_db.object

const game = await new INTER_GAME(
    'game_service_courante_proto',
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
        console.log(user, color)
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