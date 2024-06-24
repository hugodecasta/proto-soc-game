import { setup_game } from "./game_setup.js"
import { create_user_config_panel } from "./user_config.js"

if (location.host.includes('localhost')) setup_game('caca')
else create_user_config_panel().add2b()