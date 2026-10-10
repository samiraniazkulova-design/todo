const API_URL = 'http://127.0.0.1:8000/api/';

const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authSwitchLabel = document.getElementById('auth-switch-label');
const authSwitchButton = document.getElementById('show-register');
const authStatus = document.getElementById('auth-status');
const logoutBtn = document.getElementById('logout-btn');
const taskForm = document.getElementById('task-form');
const taskList = document.getElementById('task-list');
const taskModal = document.getElementById('task-modal');
const taskStatus = document.getElementById('task-status');
const appStatus = document.getElementById('app-status');
const taskSearch = document.getElementById('task-search');

let token = localStorage.getItem('access_token');
let registering = false;
let currentFilter = 'all';
let tasks = [];

function setStatus(element, message, isError = false) {
    element.textContent = message;
    element.classList.toggle('error', isError);
}

function responseMessage(data) {
    if (typeof data.detail === 'string') return data.detail;
    const findMessage = (value) => {
        if (typeof value === 'string') return value;
        if (Array.isArray(value)) return value.map(findMessage).find(Boolean);
        if (value && typeof value === 'object') return Object.values(value).map(findMessage).find(Boolean);
        return null;
    };
    return findMessage(data) || 'Суранычты аткаруу мүмкүн болгон жок.';
}

async function apiRequest(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    if (token) headers.set('Authorization', `Bearer ${token}`);

    let response;
    try {
        response = await fetch(API_URL + path, { ...options, headers });
    } catch {
        throw new Error('Серверге туташуу мүмкүн болбоду. Backend иштеп жатканын текшериңиз.');
    }
    if (!response.ok) {
        let data = {};
        try {
            data = await response.json();
        } catch {
            data = {};
        }
        if (response.status === 401 && token) {
            token = null;
            localStorage.removeItem('access_token');
            showAuth();
        }
        throw new Error(responseMessage(data));
    }
    if (response.status === 204) return null;
    return response.json();
}

function showAuth() {
    appSection.classList.add('hidden');
    authSection.classList.remove('hidden');
}

function showApp() {
    authSection.classList.add('hidden');
    appSection.classList.remove('hidden');
    document.getElementById('greeting').textContent = `Салам, ${localStorage.getItem('user_email') || 'досум'}`;
    loadTasks();
}

function setAuthMode() {
    authTitle.textContent = registering ? 'Аккаунт түзүү' : 'Кош келиңиз';
    authSubtitle.textContent = registering
        ? 'Жаңы аккаунт үчүн маалыматтарды киргизиңиз'
        : 'Улантуу үчүн аккаунтуңузга кириңиз';
    authSwitchLabel.textContent = registering ? 'Аккаунтуңуз барбы?' : 'Аккаунтуңуз жокпу?';
    authSwitchButton.textContent = registering ? 'Кирүү' : 'Катталуу';
    document.getElementById('login-btn').textContent = registering ? 'Катталуу' : 'Кирүү';
    setStatus(authStatus, '');
}

authSwitchButton.addEventListener('click', () => {
    registering = !registering;
    setAuthMode();
});

authForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const button = document.getElementById('login-btn');
    button.disabled = true;
    setStatus(authStatus, '');

    try {
        if (registering) {
            await apiRequest('users/register/', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });
            registering = false;
            setAuthMode();
            document.getElementById('password').value = '';
            setStatus(authStatus, 'Каттоо ийгиликтүү. Эми кириңиз.');
        } else {
            const data = await apiRequest('users/login/', {
                method: 'POST',
                body: JSON.stringify({ username: email, password }),
            });
            token = data.access;
            localStorage.setItem('access_token', token);
            localStorage.setItem('user_email', email);
            showApp();
        }
    } catch (error) {
        setStatus(authStatus, error.message, true);
    } finally {
        button.disabled = false;
    }
});

logoutBtn.addEventListener('click', () => {
    token = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_email');
    showAuth();
});

function updateStats() {
    document.querySelector('[data-stat="total"]').textContent = tasks.length;
    document.querySelector('[data-stat="active"]').textContent = tasks.filter((task) => !task.is_completed).length;
    document.querySelector('[data-stat="completed"]').textContent = tasks.filter((task) => task.is_completed).length;
}

function renderTasks() {
    const query = taskSearch.value.trim().toLocaleLowerCase();
    const visibleTasks = tasks.filter((task) => {
        const matchesFilter = currentFilter === 'all'
            || (currentFilter === 'active' && !task.is_completed)
            || (currentFilter === 'completed' && task.is_completed);
        const matchesSearch = `${task.title} ${task.description || ''}`.toLocaleLowerCase().includes(query);
        return matchesFilter && matchesSearch;
    });

    taskList.replaceChildren();
    if (visibleTasks.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'empty-state';
        emptyItem.textContent = tasks.length ? 'Бул шартка ылайык тапшырма жок.' : 'Азырынча тапшырма жок. + басып кошуңуз.';
        taskList.appendChild(emptyItem);
        return;
    }

    visibleTasks.forEach((task) => {
        const item = document.createElement('li');
        item.className = 'task-item';
        if (task.is_completed) item.classList.add('completed');

        const details = document.createElement('div');
        details.className = 'task-details';
        const title = document.createElement('strong');
        title.textContent = task.title;
        details.appendChild(title);
        if (task.description) {
            const description = document.createElement('p');
            description.textContent = task.description;
            details.appendChild(description);
        }

        const actions = document.createElement('div');
        actions.className = 'task-actions';
        const toggleButton = document.createElement('button');
        toggleButton.type = 'button';
        toggleButton.className = 'complete-btn';
        toggleButton.textContent = task.is_completed ? '↶' : '✓';
        toggleButton.title = task.is_completed ? 'Кайра ачуу' : 'Аткарылды деп белгилөө';
        toggleButton.setAttribute('aria-label', toggleButton.title);
        toggleButton.addEventListener('click', () => updateTask(task.id, { is_completed: !task.is_completed }));

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'delete-btn';
        deleteButton.textContent = '×';
        deleteButton.title = 'Өчүрүү';
        deleteButton.setAttribute('aria-label', 'Тапшырманы өчүрүү');
        deleteButton.addEventListener('click', () => deleteTask(task.id));

        actions.append(toggleButton, deleteButton);
        item.append(details, actions);
        taskList.appendChild(item);
    });
}

async function loadTasks() {
    try {
        const data = await apiRequest('tasks/');
        tasks = Array.isArray(data) ? data : data.results || [];
        setStatus(appStatus, '');
        updateStats();
        renderTasks();
    } catch (error) {
        if (token) {
            setStatus(appStatus, error.message, true);
            taskList.replaceChildren();
            const errorItem = document.createElement('li');
            errorItem.className = 'empty-state error';
            errorItem.textContent = error.message || 'Тапшырмалар жүктөлгөн жок.';
            taskList.appendChild(errorItem);
        }
    }
}

taskForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = taskForm.querySelector('[type="submit"]');
    submitButton.disabled = true;
    setStatus(taskStatus, '');
    const payload = {
        title: document.getElementById('task-title').value.trim(),
        description: document.getElementById('task-desc').value.trim(),
        priority: document.getElementById('task-priority').value,
    };

    try {
        await apiRequest('tasks/', { method: 'POST', body: JSON.stringify(payload) });
        taskForm.reset();
        document.getElementById('task-priority').value = 'medium';
        taskModal.classList.add('hidden');
        await loadTasks();
    } catch (error) {
        setStatus(taskStatus, error.message, true);
    } finally {
        submitButton.disabled = false;
    }
});

async function updateTask(id, changes) {
    try {
        await apiRequest(`tasks/${id}/`, { method: 'PATCH', body: JSON.stringify(changes) });
        await loadTasks();
    } catch (error) {
        setStatus(appStatus, error.message, true);
    }
}

async function deleteTask(id) {
    try {
        await apiRequest(`tasks/${id}/`, { method: 'DELETE' });
        await loadTasks();
    } catch (error) {
        setStatus(appStatus, error.message, true);
    }
}

document.getElementById('open-add-modal').addEventListener('click', () => {
    setStatus(taskStatus, '');
    taskModal.classList.remove('hidden');
    document.getElementById('task-title').focus();
});

document.getElementById('close-add-modal').addEventListener('click', () => {
    taskModal.classList.add('hidden');
});

taskModal.addEventListener('click', (event) => {
    if (event.target === taskModal) taskModal.classList.add('hidden');
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') taskModal.classList.add('hidden');
});

document.querySelectorAll('.filter-btn').forEach((button) => {
    button.addEventListener('click', () => {
        currentFilter = button.dataset.filter;
        document.querySelector('.filter-btn.active')?.classList.remove('active');
        button.classList.add('active');
        renderTasks();
    });
});

taskSearch.addEventListener('input', renderTasks);

if (token) showApp();