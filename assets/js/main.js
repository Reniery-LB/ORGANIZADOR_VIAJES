const WEATHERAPI_KEY = 'ec7e21310a2947d0bde195711252610';
const STORAGE_KEY = 'travel_planner_trips';

const form = document.getElementById('form-viaje');
const section_detalle = document.getElementById('viaje-detalles');
const nombre_detalle = document.getElementById('nombre-detalle');
const weather_area = document.getElementById('weather-area');
const task_input = document.getElementById('task-input');
const task_add = document.getElementById('task-add');
const task_list = document.getElementById('task-list');

const [input_nombre, input_destino, input_salida, input_regreso, input_email] = form.querySelectorAll('input');

let viajes = cargar_viajes();
let viaje_actual = null;
let debounceTimer = null;
let weatherAbortController = null;

function guardar_viajes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(viajes));
}

function cargar_viajes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function generar_id() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function clearErrorUnder(input) {
  const next = input.nextElementSibling;
  if (next && next.classList && next.classList.contains('validation-error')) {
    next.remove();
  }
}

function showErrorUnder(input, msg) {
  clearErrorUnder(input);
  const span = document.createElement('div');
  span.className = 'validation-error';
  span.style.color = 'red';
  span.style.fontSize = '13px';
  span.style.marginTop = '4px';
  span.textContent = msg;
  input.insertAdjacentElement('afterend', span);
}

function validar_nombre() {
  const v = input_nombre.value.trim();
  clearErrorUnder(input_nombre);
  if (v.length < 3) {
    showErrorUnder(input_nombre, 'El nombre debe tener al menos 3 caracteres');
    return false;
  }
  return true;
}

function validar_destino() {
  const v = input_destino.value.trim();
  clearErrorUnder(input_destino);
  if (v === '') {
    showErrorUnder(input_destino, 'La ciudad de destino es obligatoria');
    return false;
  }
  return true;
}

function validar_fechas() {
  clearErrorUnder(input_salida);
  clearErrorUnder(input_regreso);

  const salida = input_salida.value;
  const regreso = input_regreso.value;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (!salida) {
    showErrorUnder(input_salida, 'Fecha de salida es obligatoria');
    return false;
  }
  if (!regreso) {
    showErrorUnder(input_regreso, 'Fecha de regreso es obligatoria');
    return false;
  }

  const dSalida = new Date(salida);
  const dRegreso = new Date(regreso);

  if (isNaN(dSalida.getTime())) {
    showErrorUnder(input_salida, 'Fecha de salida inválida');
    return false;
  }
  if (isNaN(dRegreso.getTime())) {
    showErrorUnder(input_regreso, 'Fecha de regreso inválida');
    return false;
  }
  if (dSalida < hoy) {
    showErrorUnder(input_salida, 'La fecha de salida no puede ser anterior a hoy');
    return false;
  }
  if (dRegreso <= dSalida) {
    showErrorUnder(input_regreso, 'La fecha de regreso debe ser posterior a la salida');
    return false;
  }

  return true;
}

function validar_email() {
  clearErrorUnder(input_email);
  const v = input_email.value.trim();
  if (v === '') return true;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(v)) {
    showErrorUnder(input_email, 'Email inválido');
    return false;
  }
  return true;
}

function validar_formulario() {
  const a = validar_nombre();
  const b = validar_destino();
  const c = validar_fechas();
  const d = validar_email();
  return a && b && c && d;
}

async function fetch_weather(ciudad) {
  weather_area.innerHTML = 'Cargando clima...';
  if (!ciudad) {
    weather_area.innerHTML = '';
    return null;
  }

  if (weatherAbortController) {
    weatherAbortController.abort();
  }
  weatherAbortController = new AbortController();
  const signal = weatherAbortController.signal;

  const q = encodeURIComponent(ciudad);
  const url = `https://api.weatherapi.com/v1/current.json?key=${WEATHERAPI_KEY}&q=${q}&aqi=no`;

  try {
    const res = await fetch(url, { signal });
    if (!res.ok) {
      if (res.status === 400 || res.status === 403 || res.status === 404) {
        weather_area.innerHTML = 'No se encontraron datos de clima para esa ciudad.';
        return null;
      } else {
        weather_area.innerHTML = 'Error al consultar el clima.';
        return null;
      }
    }
    const data = await res.json();
    render_weather(data);
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
    } else {
      console.error('Error fetch weather', err);
      weather_area.innerHTML = 'Error de conexión al servicio de clima.';
    }
    return null;
  } finally {
    weatherAbortController = null;
  }
}

function render_weather(data) {
  if (!data) {
    weather_area.innerHTML = '';
    return;
  }
  const cityName = data.location?.name || '';
  const country = data.location?.country ? `, ${data.location.country}` : '';
  const temp = data.current?.temp_c;
  const text = data.current?.condition?.text || '';
  const icon = data.current?.condition?.icon || '';

  let iconUrl = '';
  if (icon) {
    if (icon.startsWith('//')) iconUrl = 'https:' + icon;
    else iconUrl = icon;
  }

  weather_area.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;">
      ${iconUrl ? `<img src="${iconUrl}" alt="${text}" style="width:48px;height:48px;">` : ''}
      <div>
        <div><strong>${cityName}${country}</strong></div>
        <div>${temp}°C — ${text}</div>
      </div>
    </div>
  `;
}

function debounceFetchCiudad(ciudad) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (ciudad && ciudad.trim().length > 1) {
      fetch_weather(ciudad.trim());
    } else {
      weather_area.innerHTML = '';
    }
  }, 700);
}

function render_viaje(viaje) {
  if (!viaje) return;
  section_detalle.hidden = false;
  nombre_detalle.textContent = viaje.nombre || '(Sin nombre)';
  task_list.innerHTML = '';

  const tareas = viaje.tareas || [];
  tareas.forEach(t => {
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.gap = '8px';

    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = !!t.completado;
    chk.addEventListener('change', () => {
      toggle_task(viaje.id, t.id);
    });

    const span = document.createElement('span');
    span.textContent = t.descripcion;
    if (t.completado) span.style.textDecoration = 'line-through';

    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = 'Eliminar';
    del.addEventListener('click', () => {
      remove_task(viaje.id, t.id);
    });

    li.appendChild(chk);
    li.appendChild(span);
    li.appendChild(del);

    task_list.appendChild(li);
  });

  if (viaje.destino) {
    fetch_weather(viaje.destino);
  } else {
    weather_area.innerHTML = '';
  }
}

function add_task_to_current_viaje(desc) {
  if (!viaje_actual) return;
  const viaje = viajes.find(v => v.id === viaje_actual);
  if (!viaje) return;
  const tarea = { id: generar_id(), descripcion: desc, completado: false };
  viaje.tareas = viaje.tareas || [];
  viaje.tareas.push(tarea);
  guardar_viajes();
  render_viaje(viaje);
}

function toggle_task(viajeId, taskId) {
  const viaje = viajes.find(v => v.id === viajeId);
  if (!viaje) return;
  const tarea = (viaje.tareas || []).find(x => x.id === taskId);
  if (!tarea) return;
  tarea.completado = !tarea.completado;
  guardar_viajes();
  render_viaje(viaje);
}

function remove_task(viajeId, taskId) {
  const viaje = viajes.find(v => v.id === viajeId);
  if (!viaje) return;
  viaje.tareas = (viaje.tareas || []).filter(x => x.id !== taskId);
  guardar_viajes();
  render_viaje(viaje);
}

form.addEventListener('submit', (ev) => {
  ev.preventDefault();
  [input_nombre, input_destino, input_salida, input_regreso, input_email].forEach(clearErrorUnder);

  if (!validar_formulario()) {
    return;
  }

  const nuevo = {
    id: generar_id(),
    nombre: input_nombre.value.trim(),
    destino: input_destino.value.trim(),
    salida: input_salida.value,
    regreso: input_regreso.value,
    email: input_email.value.trim(),
    tareas: []
  };

  viajes.push(nuevo);
  guardar_viajes();

  viaje_actual = nuevo.id;
  render_viaje(nuevo);

  form.reset();
});

input_nombre.addEventListener('input', validar_nombre);
input_destino.addEventListener('input', () => {
  validar_destino();
  debounceFetchCiudad(input_destino.value);
});
input_salida.addEventListener('change', validar_fechas);
input_regreso.addEventListener('change', validar_fechas);
input_email.addEventListener('input', validar_email);

task_add.addEventListener('click', (ev) => {
  ev.preventDefault();
  const text = task_input.value.trim();
  if (!text) return;
  if (!viaje_actual) {
    alert('Primero guarda un viaje para agregar tareas.');
    return;
  }
  add_task_to_current_viaje(text);
  task_input.value = '';
});

function init() {
  if (viajes.length === 0) {
    section_detalle.hidden = true;
    return;
  }
  const last = viajes[viajes.length - 1];
  viaje_actual = last.id;
  render_viaje(last);
}

init();
