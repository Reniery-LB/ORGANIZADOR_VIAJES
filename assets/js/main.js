const WEATHERAPI_KEY = 'ec7e21310a2947d0bde195711252610';
const STORAGE_KEY = 'travel_planner_trips';

const form = document.getElementById('form-viaje');
const section_detalle = document.getElementById('viaje-detalles');
const nombre_detalle = document.getElementById('nombre-detalle');
const weater_area = document.getElementById('weather-area');
const task_input = document.getElementById('task-input');
const task_add = document.getElementById('task-add');
const task_list = document.getElementById('task-list');

const [input_nombre, input_destino, input_salida, input_regreso, input_email] = form.querySelectorAll('input');

let viajes = cargar_viajes();
let viaje_actual = null;
let tiempo = null;
let weather_control = null;


