let processes = [];
let processIdCounter = 1;
const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#84cc16', '#06b6d4'];

// DOM Elements
const arrivalTimeInput = document.getElementById('arrivalTime');
const burstTimeInput = document.getElementById('burstTime');
const priorityInput = document.getElementById('priority');
const addProcessBtn = document.getElementById('addProcessBtn');
const inputTableBody = document.getElementById('inputTableBody');
const algorithmSelect = document.getElementById('algorithmSelect');
const quantumInputContainer = document.getElementById('quantumInputContainer');
const timeQuantumInput = document.getElementById('timeQuantum');
const simulateBtn = document.getElementById('simulateBtn');
const resultsSection = document.getElementById('resultsSection');
const ganttChart = document.getElementById('ganttChart');
const ganttTimeline = document.getElementById('ganttTimeline');
const avgWtSpan = document.getElementById('avgWt');
const avgTatSpan = document.getElementById('avgTat');
const outputTableBody = document.getElementById('outputTableBody');

// Event Listeners
addProcessBtn.addEventListener('click', addProcess);
algorithmSelect.addEventListener('change', toggleQuantumInput);
simulateBtn.addEventListener('click', runSimulation);

function toggleQuantumInput() {
    if (algorithmSelect.value === 'rr') {
        quantumInputContainer.style.display = 'block';
    } else {
        quantumInputContainer.style.display = 'none';
    }
}

function addProcess() {
    const at = parseInt(arrivalTimeInput.value);
    const bt = parseInt(burstTimeInput.value);
    let prio = parseInt(priorityInput.value);

    if (isNaN(at) || isNaN(bt) || at < 0 || bt < 1) {
        alert("Please enter valid Arrival Time (>=0) and Burst Time (>=1).");
        return;
    }

    if (isNaN(prio)) prio = 0;

    const process = {
        id: processIdCounter++,
        arrival_time: at,
        burst_time: bt,
        priority: prio,
        remaining_time: bt,
        waiting_time: 0,
        turnaround_time: 0,
        color: colors[(processIdCounter - 2) % colors.length]
    };

    processes.push(process);
    renderInputTable();
    
    // Clear inputs
    arrivalTimeInput.value = '';
    burstTimeInput.value = '';
    priorityInput.value = '';
}

function removeProcess(id) {
    processes = processes.filter(p => p.id !== id);
    renderInputTable();
}

function renderInputTable() {
    inputTableBody.innerHTML = '';
    processes.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>P${p.id}</td>
            <td>${p.arrival_time}</td>
            <td>${p.burst_time}</td>
            <td>${p.priority}</td>
            <td><button class="btn-danger" onclick="removeProcess(${p.id})">Remove</button></td>
        `;
        inputTableBody.appendChild(tr);
    });
}

function runSimulation() {
    if (processes.length === 0) {
        alert("Please add at least one process.");
        return;
    }

    // Reset calculated values
    let workingProcesses = processes.map(p => ({ ...p, remaining_time: p.burst_time }));
    let gantt = [];
    const algo = algorithmSelect.value;

    switch (algo) {
        case 'fcfs':
            gantt = fcfs(workingProcesses);
            break;
        case 'sjf':
            gantt = sjf(workingProcesses);
            break;
        case 'rr':
            const q = parseInt(timeQuantumInput.value);
            if (isNaN(q) || q < 1) {
                alert("Please enter a valid time quantum (>=1).");
                return;
            }
            gantt = roundRobin(workingProcesses, q);
            break;
        case 'priority':
            gantt = priorityScheduling(workingProcesses);
            break;
    }

    renderResults(workingProcesses, gantt);
}

// FCFS Algorithm
function fcfs(procs) {
    procs.sort((a, b) => a.arrival_time - b.arrival_time);
    let time = 0;
    let gantt = [];

    for (let p of procs) {
        if (time < p.arrival_time) {
            gantt.push({ id: 'IDLE', start: time, end: p.arrival_time, color: 'transparent' });
            time = p.arrival_time;
        }
        
        p.waiting_time = time - p.arrival_time;
        p.turnaround_time = p.waiting_time + p.burst_time;
        
        gantt.push({ id: p.id, start: time, end: time + p.burst_time, color: p.color });
        time += p.burst_time;
    }
    return gantt;
}

// SJF (Non-Preemptive)
function sjf(procs) {
    procs.sort((a, b) => a.arrival_time - b.arrival_time);
    let time = 0;
    let completed = 0;
    let gantt = [];
    const n = procs.length;

    while (completed < n) {
        let idx = -1;
        let min_bt = Infinity;

        for (let i = 0; i < n; i++) {
            if (procs[i].arrival_time <= time && procs[i].remaining_time > 0 && procs[i].burst_time < min_bt) {
                min_bt = procs[i].burst_time;
                idx = i;
            }
        }

        if (idx === -1) {
            let next_arrival = Infinity;
            for (let i = 0; i < n; i++) {
                if (procs[i].remaining_time > 0 && procs[i].arrival_time < next_arrival) {
                    next_arrival = procs[i].arrival_time;
                }
            }
            gantt.push({ id: 'IDLE', start: time, end: next_arrival, color: 'transparent' });
            time = next_arrival;
            continue;
        }

        let p = procs[idx];
        p.waiting_time = time - p.arrival_time;
        
        gantt.push({ id: p.id, start: time, end: time + p.burst_time, color: p.color });
        time += p.burst_time;
        
        p.turnaround_time = time - p.arrival_time;
        p.remaining_time = 0;
        completed++;
    }
    return gantt;
}

// Round Robin
function roundRobin(procs, quantum) {
    // Note: Implementing standard RR logic
    procs.sort((a, b) => a.arrival_time - b.arrival_time);
    let time = 0;
    let completed = 0;
    let gantt = [];
    let queue = [];
    let visited = new Array(procs.length).fill(false);
    const n = procs.length;

    // Push initially arrived processes
    for (let i = 0; i < n; i++) {
        if (procs[i].arrival_time <= time) {
            queue.push(i);
            visited[i] = true;
        }
    }

    while (completed < n) {
        if (queue.length === 0) {
            let next_arrival = Infinity;
            for (let i = 0; i < n; i++) {
                if (procs[i].remaining_time > 0 && procs[i].arrival_time < next_arrival) {
                    next_arrival = procs[i].arrival_time;
                }
            }
            gantt.push({ id: 'IDLE', start: time, end: next_arrival, color: 'transparent' });
            time = next_arrival;
            for (let i = 0; i < n; i++) {
                if (procs[i].arrival_time <= time && !visited[i]) {
                    queue.push(i);
                    visited[i] = true;
                }
            }
            continue;
        }

        let i = queue.shift();
        let p = procs[i];

        if (p.remaining_time > quantum) {
            gantt.push({ id: p.id, start: time, end: time + quantum, color: p.color });
            time += quantum;
            p.remaining_time -= quantum;
            
            // Check for new arrivals during execution
            for (let j = 0; j < n; j++) {
                if (procs[j].arrival_time <= time && !visited[j]) {
                    queue.push(j);
                    visited[j] = true;
                }
            }
            // Push current process back to queue
            queue.push(i);
        } else {
            gantt.push({ id: p.id, start: time, end: time + p.remaining_time, color: p.color });
            time += p.remaining_time;
            p.waiting_time = time - p.arrival_time - p.burst_time;
            p.turnaround_time = time - p.arrival_time;
            p.remaining_time = 0;
            completed++;

            for (let j = 0; j < n; j++) {
                if (procs[j].arrival_time <= time && !visited[j]) {
                    queue.push(j);
                    visited[j] = true;
                }
            }
        }
    }
    return gantt;
}

// Priority Scheduling (Non-Preemptive)
function priorityScheduling(procs) {
    procs.sort((a, b) => a.arrival_time - b.arrival_time);
    let time = 0;
    let completed = 0;
    let gantt = [];
    const n = procs.length;

    while (completed < n) {
        let idx = -1;
        let highest_prio = Infinity;

        for (let i = 0; i < n; i++) {
            if (procs[i].arrival_time <= time && procs[i].remaining_time > 0 && procs[i].priority < highest_prio) {
                highest_prio = procs[i].priority;
                idx = i;
            }
        }

        if (idx === -1) {
            let next_arrival = Infinity;
            for (let i = 0; i < n; i++) {
                if (procs[i].remaining_time > 0 && procs[i].arrival_time < next_arrival) {
                    next_arrival = procs[i].arrival_time;
                }
            }
            gantt.push({ id: 'IDLE', start: time, end: next_arrival, color: 'transparent' });
            time = next_arrival;
            continue;
        }

        let p = procs[idx];
        p.waiting_time = time - p.arrival_time;
        
        gantt.push({ id: p.id, start: time, end: time + p.burst_time, color: p.color });
        time += p.burst_time;
        
        p.turnaround_time = time - p.arrival_time;
        p.remaining_time = 0;
        completed++;
    }
    return gantt;
}

// Render Results
function renderResults(procs, gantt) {
    resultsSection.style.display = 'block';
    
    // Sort back to ID order for display
    procs.sort((a, b) => a.id - b.id);

    // Calculate Averages
    let totalWt = 0;
    let totalTat = 0;
    
    outputTableBody.innerHTML = '';
    procs.forEach(p => {
        totalWt += p.waiting_time;
        totalTat += p.turnaround_time;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>P${p.id}</td>
            <td>${p.arrival_time}</td>
            <td>${p.burst_time}</td>
            <td>${p.priority}</td>
            <td>${p.waiting_time}</td>
            <td>${p.turnaround_time}</td>
        `;
        outputTableBody.appendChild(tr);
    });

    avgWtSpan.textContent = (totalWt / procs.length).toFixed(2);
    avgTatSpan.textContent = (totalTat / procs.length).toFixed(2);

    renderGanttChart(gantt);
    
    // Smooth scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function renderGanttChart(gantt) {
    ganttChart.innerHTML = '';
    ganttTimeline.innerHTML = '';
    
    if (gantt.length === 0) return;

    const totalTime = gantt[gantt.length - 1].end;
    
    // Add initial timeline marker (0)
    addTimelineMarker(0, 0, totalTime);

    gantt.forEach((block, index) => {
        const duration = block.end - block.start;
        const widthPercent = (duration / totalTime) * 100;

        const div = document.createElement('div');
        div.className = 'gantt-block';
        div.style.width = `${widthPercent}%`;
        div.style.backgroundColor = block.id === 'IDLE' ? 'transparent' : block.color;
        
        if (block.id !== 'IDLE') {
            div.textContent = `P${block.id}`;
            const tooltip = document.createElement('span');
            tooltip.className = 'tooltip';
            tooltip.textContent = `P${block.id} (${block.start} - ${block.end})`;
            div.appendChild(tooltip);
        }

        ganttChart.appendChild(div);

        // Add timeline marker for the end of this block
        // Prevent duplicate markers if blocks are extremely small, but generally fine
        addTimelineMarker(block.end, block.end, totalTime);
    });
}

function addTimelineMarker(time, pos, totalTime) {
    const percent = (pos / totalTime) * 100;
    const span = document.createElement('span');
    span.className = 'timeline-marker';
    span.textContent = time;
    span.style.left = `${percent}%`;
    ganttTimeline.appendChild(span);
}
