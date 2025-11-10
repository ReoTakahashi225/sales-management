// データストレージ
let employees = [];
let partners = [];
let expenses = {}; // 月次支出データ: { oct: { salary: 0, insurance: 0, personalExpense: 0 }, ... }
let targets = {}; // 月次目標データ: { oct: 10000000, nov: 10000000, ... }
let currentEditingEmployee = null;
let currentEditingPartner = null;

// 月データ定義
const MONTHS = [
    { key: 'oct', label: '10月', year: '2025' },
    { key: 'nov', label: '11月', year: '2025' },
    { key: 'dec', label: '12月', year: '2025' },
    { key: 'jan', label: '1月', year: '2026' },
    { key: 'feb', label: '2月', year: '2026' },
    { key: 'mar', label: '3月', year: '2026' },
    { key: 'apr', label: '4月', year: '2026' },
    { key: 'may', label: '5月', year: '2026' },
    { key: 'jun', label: '6月', year: '2026' },
    { key: 'jul', label: '7月', year: '2026' },
    { key: 'aug', label: '8月', year: '2026' },
    { key: 'sep', label: '9月', year: '2026' }
];

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    initializeExpenses();
    loadFromLocalStorage();
    renderEmployeeTable();
    renderPartnerTable();
    updateDashboard();
    updateMonthlyReport();
    updateDataStats();

    // フォーム送信イベント
    document.getElementById('employeeForm').addEventListener('submit', saveEmployee);
    document.getElementById('partnerForm').addEventListener('submit', savePartner);

    // 自動保存（3分ごと）
    setInterval(() => {
        saveToLocalStorage();
        console.log('自動保存しました');
    }, 180000);
});

// 支出データの初期化
function initializeExpenses() {
    MONTHS.forEach(month => {
        if (!expenses[month.key]) {
            expenses[month.key] = {
                salary: 0,
                insurance: 0,
                personalExpense: 0
            };
        }
    });
}

// タブ切り替え
function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');

    if (tabName === 'dashboard') {
        updateDashboard();
    } else if (tabName === 'report') {
        updateMonthlyReport();
    } else if (tabName === 'data') {
        updateDataStats();
        updateJSONPreview();
    } else if (tabName === 'expenses') {
        renderExpensesTab();
    } else if (tabName === 'targets') {
        renderTargetsTab();
    }
}

// ========== 社員管理 ==========

function openEmployeeModal(employeeId = null) {
    const modal = document.getElementById('employeeModal');
    const form = document.getElementById('employeeForm');
    form.reset();
    
    // 月別タブを生成
    createEmployeeMonthTabs();
    
    if (employeeId !== null) {
        const employee = employees.find(e => e.id === employeeId);
        if (employee) {
            document.getElementById('employeeId').value = employee.id;
            document.getElementById('employeeName').value = employee.name;
            document.getElementById('employeeDept').value = employee.dept;
            
            MONTHS.forEach(month => {
                const monthData = employee[month.key] || {};
                document.getElementById(`emp_${month.key}_customer`).value = monthData.customer || '';
                document.getElementById(`emp_${month.key}_revenue`).value = monthData.revenue || '';
                document.getElementById(`emp_${month.key}_type`).value = monthData.type || '';
            });
        }
    } else {
        // 新規追加時は最初の月タブをアクティブに
        switchEmployeeMonth(0);
    }
    
    modal.classList.add('active');
}

function createEmployeeMonthTabs() {
    const tabsContainer = document.getElementById('employeeMonthTabs');
    const contentsContainer = document.getElementById('employeeMonthContents');
    
    tabsContainer.innerHTML = '';
    contentsContainer.innerHTML = '';
    
    MONTHS.forEach((month, index) => {
        // タブ作成
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'month-tab' + (index === 0 ? ' active' : '');
        tab.textContent = `${month.year}年${month.label}`;
        tab.onclick = () => switchEmployeeMonth(index);
        tabsContainer.appendChild(tab);
        
        // コンテンツ作成
        const content = document.createElement('div');
        content.className = 'month-content' + (index === 0 ? ' active' : '');
        content.id = `emp_month_${index}`;
        content.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <label>顧客</label>
                    <input type="text" id="emp_${month.key}_customer" autocomplete="off" list="customerList">
                </div>
                <div class="form-group">
                    <label>売上（円）</label>
                    <input type="number" id="emp_${month.key}_revenue" step="1000" autocomplete="off">
                </div>
                <div class="form-group">
                    <label>形態</label>
                    <select id="emp_${month.key}_type">
                        <option value="">選択</option>
                        <option value="常駐">常駐</option>
                        <option value="請負">請負</option>
                    </select>
                </div>
            </div>
        `;
        contentsContainer.appendChild(content);
    });
}

function switchEmployeeMonth(index) {
    document.querySelectorAll('.month-tab').forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
    });
    document.querySelectorAll('.month-content').forEach((content, i) => {
        content.classList.toggle('active', i === index);
    });
}

function copyPreviousMonth() {
    const activeIndex = [...document.querySelectorAll('.month-tab')].findIndex(tab => tab.classList.contains('active'));
    if (activeIndex === 0) {
        alert('最初の月です。コピー元がありません。');
        return;
    }
    
    const prevMonth = MONTHS[activeIndex - 1];
    const currMonth = MONTHS[activeIndex];
    
    const prevCustomer = document.getElementById(`emp_${prevMonth.key}_customer`).value;
    const prevRevenue = document.getElementById(`emp_${prevMonth.key}_revenue`).value;
    const prevType = document.getElementById(`emp_${prevMonth.key}_type`).value;
    
    document.getElementById(`emp_${currMonth.key}_customer`).value = prevCustomer;
    document.getElementById(`emp_${currMonth.key}_revenue`).value = prevRevenue;
    document.getElementById(`emp_${currMonth.key}_type`).value = prevType;
    
    alert('前月のデータをコピーしました');
}

function copyToAllMonths() {
    const activeIndex = [...document.querySelectorAll('.month-tab')].findIndex(tab => tab.classList.contains('active'));
    const currMonth = MONTHS[activeIndex];
    
    const customer = document.getElementById(`emp_${currMonth.key}_customer`).value;
    const revenue = document.getElementById(`emp_${currMonth.key}_revenue`).value;
    const type = document.getElementById(`emp_${currMonth.key}_type`).value;
    
    if (!customer && !revenue && !type) {
        alert('コピーするデータがありません');
        return;
    }
    
    if (!confirm('現在の月のデータを全ての月にコピーしますか？')) return;
    
    MONTHS.forEach(month => {
        document.getElementById(`emp_${month.key}_customer`).value = customer;
        document.getElementById(`emp_${month.key}_revenue`).value = revenue;
        document.getElementById(`emp_${month.key}_type`).value = type;
    });
    
    alert('全ての月にコピーしました');
}

function clearAllMonths() {
    if (!confirm('全ての月のデータをクリアしますか？')) return;
    
    MONTHS.forEach(month => {
        document.getElementById(`emp_${month.key}_customer`).value = '';
        document.getElementById(`emp_${month.key}_revenue`).value = '';
        document.getElementById(`emp_${month.key}_type`).value = '';
    });
    
    alert('全ての月をクリアしました');
}

function closeEmployeeModal() {
    document.getElementById('employeeModal').classList.remove('active');
}

function saveEmployee(e) {
    e.preventDefault();
    
    const employeeId = document.getElementById('employeeId').value;
    const employeeData = {
        id: employeeId || Date.now().toString(),
        name: document.getElementById('employeeName').value,
        dept: document.getElementById('employeeDept').value,
        updatedAt: new Date().toISOString()
    };
    
    // 各月のデータを保存
    MONTHS.forEach(month => {
        employeeData[month.key] = {
            customer: document.getElementById(`emp_${month.key}_customer`).value,
            revenue: parseFloat(document.getElementById(`emp_${month.key}_revenue`).value) || 0,
            type: document.getElementById(`emp_${month.key}_type`).value
        };
    });
    
    if (employeeId) {
        const index = employees.findIndex(e => e.id === employeeId);
        if (index !== -1) {
            employees[index] = employeeData;
        }
    } else {
        employees.push(employeeData);
    }
    
    saveToLocalStorage();
    renderEmployeeTable();
    updateDashboard();
    closeEmployeeModal();
    
    alert('社員情報を保存しました！');
}

function deleteEmployee(employeeId) {
    if (!confirm('本当にこの社員データを削除しますか？')) return;
    
    employees = employees.filter(e => e.id !== employeeId);
    saveToLocalStorage();
    renderEmployeeTable();
    updateDashboard();
    
    alert('社員データを削除しました。');
}

function renderEmployeeTable() {
    const tbody = document.getElementById('employeeTableBody');

    // 社員とBPを統合
    const allPersons = [
        ...employees.map(emp => ({ ...emp, type: '社員', category: emp.dept })),
        ...partners.map(bp => ({ ...bp, type: 'BP', category: bp.company || '-', revenue: bp }))
    ];

    if (allPersons.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="16" style="text-align: center; padding: 40px; color: #6c757d;">
                    データがありません。「社員追加」ボタンまたは「BP原価」タブから登録してください。
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = allPersons.map(person => {
        let revenues, total, editFunc, deleteFunc;

        if (person.type === '社員') {
            revenues = MONTHS.map(m => person[m.key]?.revenue || 0);
            total = revenues.reduce((sum, val) => sum + val, 0);
            editFunc = `openEmployeeModal('${person.id}')`;
            deleteFunc = `deleteEmployee('${person.id}')`;
        } else {
            // BPの場合はcostをrevenueとして表示
            revenues = MONTHS.map(m => person.revenue[m.key]?.cost || 0);
            total = revenues.reduce((sum, val) => sum + val, 0);
            editFunc = `openPartnerModal('${person.id}')`;
            deleteFunc = `deletePartner('${person.id}')`;
        }

        const badgeClass = person.type === '社員' ? 'badge-info' : 'badge-warning';

        return `
            <tr>
                <td style="position: sticky; left: 0; background: white; font-weight: 600;">${person.name}</td>
                <td><span class="badge ${badgeClass}">${person.type}</span> ${person.category}</td>
                ${revenues.map(rev => `<td>¥${rev.toLocaleString()}</td>`).join('')}
                <td style="background: #fff3cd; font-weight: 600;">¥${total.toLocaleString()}</td>
                <td>
                    <button class="icon-btn" onclick="${editFunc}" title="編集">✏️</button>
                    <button class="icon-btn" onclick="${deleteFunc}" title="削除">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterEmployees() {
    const searchTerm = document.getElementById('employeeSearch').value.toLowerCase();
    const tbody = document.getElementById('employeeTableBody');
    const rows = tbody.querySelectorAll('tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function exportEmployeeData() {
    const headers = ['氏名', '区分', '所属/会社', ...MONTHS.map(m => `${m.year}年${m.label}`), '合計'];

    // 社員データ
    const employeeRows = employees.map(emp => {
        const revenues = MONTHS.map(m => emp[m.key]?.revenue || 0);
        const total = revenues.reduce((sum, val) => sum + val, 0);
        return [emp.name, '社員', emp.dept, ...revenues, total];
    });

    // BPデータ
    const partnerRows = partners.map(bp => {
        const costs = MONTHS.map(m => bp[m.key]?.cost || 0);
        const total = costs.reduce((sum, val) => sum + val, 0);
        return [bp.name, 'BP', bp.company || '-', ...costs, total];
    });

    const rows = [...employeeRows, ...partnerRows];

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `社員売上（BP含む）_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// ========== BP管理 ==========

function openPartnerModal(partnerId = null) {
    const modal = document.getElementById('partnerModal');
    const form = document.getElementById('partnerForm');
    form.reset();
    
    createPartnerMonthTabs();
    
    if (partnerId !== null) {
        const partner = partners.find(p => p.id === partnerId);
        if (partner) {
            document.getElementById('partnerId').value = partner.id;
            document.getElementById('partnerName').value = partner.name;
            document.getElementById('partnerCompany').value = partner.company || '';
            
            MONTHS.forEach(month => {
                const monthData = partner[month.key] || {};
                document.getElementById(`bp_${month.key}_cost`).value = monthData.cost || '';
            });
        }
    } else {
        switchPartnerMonth(0);
    }
    
    modal.classList.add('active');
}

function createPartnerMonthTabs() {
    const tabsContainer = document.getElementById('partnerMonthTabs');
    const contentsContainer = document.getElementById('partnerMonthContents');
    
    tabsContainer.innerHTML = '';
    contentsContainer.innerHTML = '';
    
    MONTHS.forEach((month, index) => {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'month-tab' + (index === 0 ? ' active' : '');
        tab.textContent = `${month.year}年${month.label}`;
        tab.onclick = () => switchPartnerMonth(index);
        tabsContainer.appendChild(tab);
        
        const content = document.createElement('div');
        content.className = 'month-content' + (index === 0 ? ' active' : '');
        content.id = `bp_month_${index}`;
        content.innerHTML = `
            <div class="form-group">
                <label>請求額（円）</label>
                <input type="number" id="bp_${month.key}_cost" step="1000" autocomplete="off">
            </div>
        `;
        contentsContainer.appendChild(content);
    });
}

function switchPartnerMonth(index) {
    document.querySelectorAll('#partnerMonthTabs .month-tab').forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
    });
    document.querySelectorAll('#partnerMonthContents .month-content').forEach((content, i) => {
        content.classList.toggle('active', i === index);
    });
}

function copyPreviousMonthBP() {
    const activeIndex = [...document.querySelectorAll('#partnerMonthTabs .month-tab')].findIndex(tab => tab.classList.contains('active'));
    if (activeIndex === 0) {
        alert('最初の月です。コピー元がありません。');
        return;
    }
    
    const prevMonth = MONTHS[activeIndex - 1];
    const currMonth = MONTHS[activeIndex];
    
    const prevCost = document.getElementById(`bp_${prevMonth.key}_cost`).value;
    document.getElementById(`bp_${currMonth.key}_cost`).value = prevCost;
    
    alert('前月のデータをコピーしました');
}

function copyToAllMonthsBP() {
    const activeIndex = [...document.querySelectorAll('#partnerMonthTabs .month-tab')].findIndex(tab => tab.classList.contains('active'));
    const currMonth = MONTHS[activeIndex];
    
    const cost = document.getElementById(`bp_${currMonth.key}_cost`).value;
    
    if (!cost) {
        alert('コピーするデータがありません');
        return;
    }
    
    if (!confirm('現在の月の金額を全ての月にコピーしますか？')) return;
    
    MONTHS.forEach(month => {
        document.getElementById(`bp_${month.key}_cost`).value = cost;
    });
    
    alert('全ての月にコピーしました');
}

function closePartnerModal() {
    document.getElementById('partnerModal').classList.remove('active');
}

function savePartner(e) {
    e.preventDefault();
    
    const partnerId = document.getElementById('partnerId').value;
    const partnerData = {
        id: partnerId || Date.now().toString(),
        name: document.getElementById('partnerName').value,
        company: document.getElementById('partnerCompany').value,
        updatedAt: new Date().toISOString()
    };
    
    MONTHS.forEach(month => {
        partnerData[month.key] = {
            cost: parseFloat(document.getElementById(`bp_${month.key}_cost`).value) || 0
        };
    });
    
    if (partnerId) {
        const index = partners.findIndex(p => p.id === partnerId);
        if (index !== -1) {
            partners[index] = partnerData;
        }
    } else {
        partners.push(partnerData);
    }
    
    saveToLocalStorage();
    renderPartnerTable();
    updateDashboard();
    closePartnerModal();
    
    alert('BP情報を保存しました！');
}

function deletePartner(partnerId) {
    if (!confirm('本当にこのBPデータを削除しますか？')) return;
    
    partners = partners.filter(p => p.id !== partnerId);
    saveToLocalStorage();
    renderPartnerTable();
    updateDashboard();
    
    alert('BPデータを削除しました。');
}

function renderPartnerTable() {
    const tbody = document.getElementById('partnerTableBody');
    
    if (partners.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="16" style="text-align: center; padding: 40px; color: #6c757d;">
                    データがありません。「BP追加」ボタンから登録してください。
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = partners.map(bp => {
        const costs = MONTHS.map(m => bp[m.key]?.cost || 0);
        const total = costs.reduce((sum, val) => sum + val, 0);
        
        return `
            <tr>
                <td style="position: sticky; left: 0; background: white; font-weight: 600;">${bp.name}</td>
                <td><span class="badge badge-warning">${bp.company || '-'}</span></td>
                ${costs.map(cost => `<td>¥${cost.toLocaleString()}</td>`).join('')}
                <td style="background: #fff3cd; font-weight: 600;">¥${total.toLocaleString()}</td>
                <td>
                    <button class="icon-btn" onclick="openPartnerModal('${bp.id}')" title="編集">✏️</button>
                    <button class="icon-btn" onclick="deletePartner('${bp.id}')" title="削除">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterPartners() {
    const searchTerm = document.getElementById('partnerSearch').value.toLowerCase();
    const tbody = document.getElementById('partnerTableBody');
    const rows = tbody.querySelectorAll('tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function exportPartnerData() {
    const headers = ['氏名', '所属会社', ...MONTHS.map(m => `${m.year}年${m.label}`), '合計'];
    const rows = partners.map(bp => {
        const costs = MONTHS.map(m => bp[m.key]?.cost || 0);
        const total = costs.reduce((sum, val) => sum + val, 0);
        return [bp.name, bp.company || '', ...costs, total];
    });
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `BP原価_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// ========== ダッシュボード ==========

function updateDashboard() {
    let empTotal = 0;
    employees.forEach(emp => {
        MONTHS.forEach(month => {
            empTotal += emp[month.key]?.revenue || 0;
        });
    });

    let bpTotal = 0;
    partners.forEach(bp => {
        MONTHS.forEach(month => {
            bpTotal += bp[month.key]?.cost || 0;
        });
    });

    // 支出合計を計算
    let expenseTotal = 0;
    MONTHS.forEach(month => {
        const expenseData = expenses[month.key] || { salary: 0, insurance: 0, personalExpense: 0 };
        expenseTotal += expenseData.salary + expenseData.insurance + expenseData.personalExpense;
    });

    const totalRevenue = empTotal + bpTotal;
    const totalPayment = expenseTotal + bpTotal;
    const totalProfit = totalRevenue - totalPayment;

    const activeEmployees = employees.filter(e => {
        const total = MONTHS.reduce((sum, m) => sum + (e[m.key]?.revenue || 0), 0);
        return total > 0;
    }).length;

    const activePartners = partners.filter(p => {
        const total = MONTHS.reduce((sum, m) => sum + (p[m.key]?.cost || 0), 0);
        return total > 0;
    }).length;

    const activeCount = activeEmployees + activePartners;
    const avgRevenue = activeEmployees > 0 ? empTotal / activeEmployees / 12 : 0;

    document.getElementById('totalRevenue').textContent = `¥${totalRevenue.toLocaleString()}`;
    document.getElementById('employeeRevenue').textContent = `¥${empTotal.toLocaleString()}`;
    document.getElementById('partnerRevenue').textContent = `¥${bpTotal.toLocaleString()}`;
    document.getElementById('totalPayment').textContent = `¥${totalPayment.toLocaleString()}`;
    document.getElementById('totalProfit').textContent = `¥${totalProfit.toLocaleString()}`;
    document.getElementById('activeCount').textContent = `${activeCount}名`;
    document.getElementById('avgRevenue').textContent = `¥${Math.round(avgRevenue).toLocaleString()}`;

    updateRecentUpdates();
    renderMonthlyTrendChart();
}

let monthlyTrendChartInstance = null;

function renderMonthlyTrendChart() {
    // 月ごとの売上と粗利を計算
    const monthlyRevenue = [];
    const monthlyProfit = [];

    MONTHS.forEach(month => {
        // 月の売上（社員売上）
        let empRevenue = 0;
        employees.forEach(emp => {
            empRevenue += emp[month.key]?.revenue || 0;
        });

        // 月のBP原価
        let bpCost = 0;
        partners.forEach(bp => {
            bpCost += bp[month.key]?.cost || 0;
        });

        // 月の支出
        const expenseData = expenses[month.key] || { salary: 0, insurance: 0, personalExpense: 0 };
        const monthExpense = expenseData.salary + expenseData.insurance + expenseData.personalExpense;

        // 月の売上合計（社員売上 + BP原価）
        const totalRevenue = empRevenue + bpCost;

        // 月の粗利（売上 - 支払額）
        const totalPayment = monthExpense + bpCost;
        const profit = totalRevenue - totalPayment;

        monthlyRevenue.push(totalRevenue);
        monthlyProfit.push(profit);
    });

    const ctx = document.getElementById('monthlyTrendChart');

    // 既存のチャートがあれば破棄
    if (monthlyTrendChartInstance) {
        monthlyTrendChartInstance.destroy();
    }

    // 目標データを取得
    const monthlyTarget = MONTHS.map(month => targets[month.key] || 0);

    const datasets = [
        {
            label: '売上',
            data: monthlyRevenue,
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            tension: 0.3,
            fill: true
        },
        {
            label: '粗利',
            data: monthlyProfit,
            borderColor: '#2ecc71',
            backgroundColor: 'rgba(46, 204, 113, 0.1)',
            tension: 0.3,
            fill: true
        }
    ];

    // 目標データがある場合は追加
    const hasTarget = monthlyTarget.some(val => val > 0);
    if (hasTarget) {
        datasets.push({
            label: '目標',
            data: monthlyTarget,
            borderColor: '#e74c3c',
            backgroundColor: 'rgba(231, 76, 60, 0.05)',
            borderDash: [5, 5],
            tension: 0.3,
            fill: false,
            pointRadius: 4,
            pointBackgroundColor: '#e74c3c'
        });
    }

    monthlyTrendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: MONTHS.map(m => `${m.year}年${m.label}`),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2.5,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 14
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += '¥' + context.parsed.y.toLocaleString();
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '¥' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

function updateRecentUpdates() {
    const allData = [
        ...employees.map(e => ({ type: '社員', name: e.name, updatedAt: e.updatedAt })),
        ...partners.map(p => ({ type: 'BP', name: p.name, updatedAt: p.updatedAt }))
    ].filter(d => d.updatedAt).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5);
    
    const container = document.getElementById('recentUpdates');
    
    if (allData.length === 0) {
        container.innerHTML = '<p style="color: #6c757d;">更新履歴はありません。</p>';
        return;
    }
    
    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>種類</th>
                    <th>名前</th>
                    <th>更新日時</th>
                </tr>
            </thead>
            <tbody>
                ${allData.map(d => `
                    <tr>
                        <td><span class="badge ${d.type === '社員' ? 'badge-info' : 'badge-warning'}">${d.type}</span></td>
                        <td>${d.name}</td>
                        <td>${new Date(d.updatedAt).toLocaleString('ja-JP')}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ========== 目標管理 ==========

function renderTargetsTab() {
    const tbody = document.getElementById('targetTableBody');

    if (!tbody) return;

    tbody.innerHTML = MONTHS.map(month => {
        const value = targets[month.key] || 0;
        return `
            <tr>
                <td style="font-weight: 600;">${month.year}年${month.label}</td>
                <td>
                    <input type="number"
                           id="target_${month.key}"
                           value="${value}"
                           style="width: 200px; padding: 8px; border: 1px solid #bdc3c7; border-radius: 4px;"
                           step="100000"
                           min="0"
                           placeholder="目標売上を入力">
                </td>
            </tr>
        `;
    }).join('');
}

function saveTargets() {
    MONTHS.forEach(month => {
        const input = document.getElementById(`target_${month.key}`);
        targets[month.key] = parseFloat(input.value) || 0;
    });

    saveToLocalStorage();
    updateDashboard(); // グラフを更新
    alert('目標を保存しました！');
}

function copyTargetToAll() {
    const firstValue = document.getElementById('target_oct').value;

    if (!firstValue || firstValue === '0') {
        alert('10月の目標金額を入力してください。');
        return;
    }

    if (!confirm(`全ての月に ${parseFloat(firstValue).toLocaleString()}円を設定しますか？`)) return;

    MONTHS.forEach(month => {
        document.getElementById(`target_${month.key}`).value = firstValue;
    });

    alert('全ての月に同じ目標を設定しました。「保存」ボタンを押して保存してください。');
}

// ========== 月次報告 ==========

function updateMonthlyReport() {
    const monthTotals = MONTHS.map(month => {
        let empTotal = 0;
        employees.forEach(emp => {
            empTotal += emp[month.key]?.revenue || 0;
        });

        let bpTotal = 0;
        partners.forEach(bp => {
            bpTotal += bp[month.key]?.cost || 0;
        });

        const expenseData = expenses[month.key] || { salary: 0, insurance: 0, personalExpense: 0 };
        const expenseTotal = expenseData.salary + expenseData.insurance + expenseData.personalExpense;

        const revenue = empTotal + bpTotal;
        const payment = expenseTotal + bpTotal;
        const profit = revenue - payment;

        return { month, empTotal, bpTotal, expenseTotal, revenue, payment, profit };
    });

    const reportHtml = `
        <div class="report-section">
            <h3>月別収支推移</h3>
            <table>
                <thead>
                    <tr>
                        <th>月</th>
                        <th>社員売上</th>
                        <th>BP原価</th>
                        <th>売上合計</th>
                        <th>支出計</th>
                        <th>支払額</th>
                        <th style="background: #e8f5e9;">粗利</th>
                    </tr>
                </thead>
                <tbody>
                    ${monthTotals.map(data => `
                        <tr>
                            <td><strong>${data.month.year}年${data.month.label}</strong></td>
                            <td>¥${data.empTotal.toLocaleString()}</td>
                            <td>¥${data.bpTotal.toLocaleString()}</td>
                            <td><strong>¥${data.revenue.toLocaleString()}</strong></td>
                            <td>¥${data.expenseTotal.toLocaleString()}</td>
                            <td>¥${data.payment.toLocaleString()}</td>
                            <td style="background: #e8f5e9; font-weight: 600;">¥${data.profit.toLocaleString()}</td>
                        </tr>
                    `).join('')}
                    <tr style="background: #f8f9fa; font-weight: 600;">
                        <td>年間合計</td>
                        <td>¥${monthTotals.reduce((sum, d) => sum + d.empTotal, 0).toLocaleString()}</td>
                        <td>¥${monthTotals.reduce((sum, d) => sum + d.bpTotal, 0).toLocaleString()}</td>
                        <td>¥${monthTotals.reduce((sum, d) => sum + d.revenue, 0).toLocaleString()}</td>
                        <td>¥${monthTotals.reduce((sum, d) => sum + d.expenseTotal, 0).toLocaleString()}</td>
                        <td>¥${monthTotals.reduce((sum, d) => sum + d.payment, 0).toLocaleString()}</td>
                        <td style="background: #e8f5e9;">¥${monthTotals.reduce((sum, d) => sum + d.profit, 0).toLocaleString()}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="report-section">
            <h3>社員別売上TOP10</h3>
            <table>
                <thead>
                    <tr>
                        <th>順位</th>
                        <th>社員名</th>
                        <th>所属</th>
                        <th>年間売上</th>
                    </tr>
                </thead>
                <tbody>
                    ${employees.map(emp => {
                        const total = MONTHS.reduce((sum, m) => sum + (emp[m.key]?.revenue || 0), 0);
                        return { ...emp, total };
                    }).sort((a, b) => b.total - a.total).slice(0, 10).map((emp, idx) => `
                        <tr>
                            <td><strong>${idx + 1}</strong></td>
                            <td>${emp.name}</td>
                            <td><span class="badge badge-info">${emp.dept}</span></td>
                            <td><strong>¥${emp.total.toLocaleString()}</strong></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('monthlyReport').innerHTML = reportHtml;
}

function exportReport() {
    const headers = ['月', '社員売上', 'BP原価', '合計'];
    const rows = MONTHS.map(month => {
        let empTotal = 0;
        employees.forEach(emp => {
            empTotal += emp[month.key]?.revenue || 0;
        });
        
        let bpTotal = 0;
        partners.forEach(bp => {
            bpTotal += bp[month.key]?.cost || 0;
        });
        
        return [`${month.year}年${month.label}`, empTotal, bpTotal, empTotal + bpTotal];
    });
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `月次報告_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// ========== データ管理 ==========

function saveData() {
    saveToLocalStorage();
    alert('データをローカルストレージに保存しました！');
    updateDataStats();
}

function saveToLocalStorage() {
    const data = {
        employees,
        partners,
        expenses,
        targets,
        savedAt: new Date().toISOString()
    };
    localStorage.setItem('salesManagementData', JSON.stringify(data));
}

function loadFromLocalStorage() {
    const savedData = localStorage.getItem('salesManagementData');
    if (savedData) {
        const data = JSON.parse(savedData);
        employees = data.employees || [];
        partners = data.partners || [];
        if (data.expenses) {
            expenses = data.expenses;
        }
        if (data.targets) {
            targets = data.targets;
        }
    }
}

function downloadJSON() {
    const data = {
        employees,
        partners,
        expenses,
        targets,
        exportedAt: new Date().toISOString(),
        version: '2.1',
        period: '第21期（2025年10月～2026年9月）'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `売上実績データ_${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    alert('JSONファイルをダウンロードしました！');
}

function uploadJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            employees = data.employees || [];
            partners = data.partners || [];
            if (data.expenses) {
                expenses = data.expenses;
            } else {
                initializeExpenses();
            }
            if (data.targets) {
                targets = data.targets;
            }

            saveToLocalStorage();
            renderEmployeeTable();
            renderPartnerTable();
            updateDashboard();
            updateDataStats();

            alert('JSONファイルを読み込みました！');
        } catch (error) {
            alert('JSONファイルの読み込みに失敗しました: ' + error.message);
        }
    };
    reader.readAsText(file);
}

function updateDataStats() {
    document.getElementById('employeeCount').textContent = employees.length;
    document.getElementById('partnerCount').textContent = partners.length;
    
    const savedData = localStorage.getItem('salesManagementData');
    if (savedData) {
        const data = JSON.parse(savedData);
        const savedAt = new Date(data.savedAt);
        document.getElementById('lastUpdate').textContent = savedAt.toLocaleString('ja-JP');
    }
}

function updateJSONPreview() {
    const data = { employees, partners, expenses };
    document.getElementById('jsonPreview').value = JSON.stringify(data, null, 2);
}

function confirmClearData() {
    if (!confirm('本当にすべてのデータを削除しますか？この操作は取り消せません。')) return;
    if (!confirm('確認：すべてのデータが完全に削除されます。よろしいですか？')) return;

    employees = [];
    partners = [];
    initializeExpenses();
    localStorage.removeItem('salesManagementData');

    renderEmployeeTable();
    renderPartnerTable();
    updateDashboard();
    updateDataStats();

    alert('すべてのデータを削除しました。');
}

// ========== 一括編集 ==========

let bulkEditData = [];

function bulkEditEmployees() {
    const modal = document.getElementById('bulkEditModal');

    // 社員とBPを統合
    bulkEditData = [
        ...employees.map(emp => ({ ...emp, type: '社員', category: emp.dept })),
        ...partners.map(bp => ({ ...bp, type: 'BP', category: bp.company || '-' }))
    ];

    renderBulkEditTable();
    modal.classList.add('active');
}

function renderBulkEditTable() {
    const tbody = document.getElementById('bulkEditTableBody');

    if (bulkEditData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="16" style="text-align: center; padding: 40px;">
                    データがありません
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = bulkEditData.map((person, idx) => {
        const badgeClass = person.type === '社員' ? 'badge-info' : 'badge-warning';

        return `
            <tr data-index="${idx}">
                <td style="position: sticky; left: 0; background: white; z-index: 5;">
                    <input type="checkbox" class="row-select" data-index="${idx}">
                </td>
                <td style="position: sticky; left: 40px; background: white; z-index: 5; font-weight: 600;">
                    ${person.name}
                </td>
                <td><span class="badge ${badgeClass}">${person.type}</span></td>
                <td>
                    <input type="text"
                           class="bulk-edit-input"
                           value="${person.category}"
                           data-index="${idx}"
                           data-field="category"
                           style="width: 100px;">
                </td>
                ${MONTHS.map(month => {
                    let value = 0;
                    if (person.type === '社員') {
                        value = person[month.key]?.revenue || 0;
                    } else {
                        value = person[month.key]?.cost || 0;
                    }
                    return `
                        <td>
                            <input type="number"
                                   class="bulk-edit-input"
                                   value="${value}"
                                   data-index="${idx}"
                                   data-month="${month.key}"
                                   style="width: 100px;"
                                   step="1000">
                        </td>
                    `;
                }).join('')}
            </tr>
        `;
    }).join('');

    // イベントリスナーを追加
    document.querySelectorAll('.bulk-edit-input').forEach(input => {
        input.addEventListener('change', updateBulkEditData);
    });
}

function updateBulkEditData(event) {
    const input = event.target;
    const index = parseInt(input.dataset.index);
    const person = bulkEditData[index];

    if (input.dataset.field === 'category') {
        // 所属/会社の更新
        bulkEditData[index].category = input.value;
    } else if (input.dataset.month) {
        // 月別売上/コストの更新
        const monthKey = input.dataset.month;
        const value = parseFloat(input.value) || 0;

        if (person.type === '社員') {
            if (!bulkEditData[index][monthKey]) {
                bulkEditData[index][monthKey] = {};
            }
            bulkEditData[index][monthKey].revenue = value;
        } else {
            if (!bulkEditData[index][monthKey]) {
                bulkEditData[index][monthKey] = {};
            }
            bulkEditData[index][monthKey].cost = value;
        }
    }
}

function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.row-select');

    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
}

function filterBulkEditTable() {
    const searchTerm = document.getElementById('bulkSearch').value.toLowerCase();
    const tbody = document.getElementById('bulkEditTableBody');
    const rows = tbody.querySelectorAll('tr');

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function saveBulkEdit() {
    if (!confirm('一括編集の内容を保存しますか？')) return;

    // 選択された行のみ保存するか、全て保存するか
    const selectedCheckboxes = document.querySelectorAll('.row-select:checked');

    if (selectedCheckboxes.length > 0) {
        // 選択された行のみ更新
        if (!confirm(`選択された${selectedCheckboxes.length}件のデータを更新しますか？`)) return;

        selectedCheckboxes.forEach(checkbox => {
            const index = parseInt(checkbox.dataset.index);
            updatePersonData(bulkEditData[index]);
        });
    } else {
        // 全データを更新
        if (!confirm('すべてのデータを更新しますか？')) return;

        bulkEditData.forEach(person => {
            updatePersonData(person);
        });
    }

    saveToLocalStorage();
    renderEmployeeTable();
    renderPartnerTable();
    updateDashboard();
    closeBulkEditModal();

    alert('一括編集を保存しました！');
}

function updatePersonData(person) {
    if (person.type === '社員') {
        // 社員データを更新
        const empIndex = employees.findIndex(e => e.id === person.id);
        if (empIndex !== -1) {
            employees[empIndex].dept = person.category;
            MONTHS.forEach(month => {
                employees[empIndex][month.key] = person[month.key];
            });
            employees[empIndex].updatedAt = new Date().toISOString();
        }
    } else {
        // BPデータを更新
        const bpIndex = partners.findIndex(p => p.id === person.id);
        if (bpIndex !== -1) {
            partners[bpIndex].company = person.category;
            MONTHS.forEach(month => {
                partners[bpIndex][month.key] = person[month.key];
            });
            partners[bpIndex].updatedAt = new Date().toISOString();
        }
    }
}

function closeBulkEditModal() {
    document.getElementById('bulkEditModal').classList.remove('active');
    document.getElementById('selectAll').checked = false;
    bulkEditData = [];
}

// ========== BP一括編集 ==========

let bulkEditPartnerData = [];

function bulkEditPartners() {
    const modal = document.getElementById('bulkEditPartnerModal');

    // BPデータをコピー
    bulkEditPartnerData = partners.map(bp => ({ ...bp }));

    renderBulkEditPartnerTable();
    modal.classList.add('active');
}

function renderBulkEditPartnerTable() {
    const tbody = document.getElementById('bulkEditPartnerTableBody');

    if (bulkEditPartnerData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="15" style="text-align: center; padding: 40px;">
                    データがありません
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = bulkEditPartnerData.map((bp, idx) => {
        return `
            <tr data-index="${idx}">
                <td style="position: sticky; left: 0; background: white; z-index: 5;">
                    <input type="checkbox" class="row-select-partner" data-index="${idx}">
                </td>
                <td style="position: sticky; left: 40px; background: white; z-index: 5; font-weight: 600;">
                    ${bp.name}
                </td>
                <td>
                    <input type="text"
                           class="bulk-edit-partner-input"
                           value="${bp.company || ''}"
                           data-index="${idx}"
                           data-field="company"
                           style="width: 120px;">
                </td>
                ${MONTHS.map(month => {
                    const value = bp[month.key]?.cost || 0;
                    return `
                        <td>
                            <input type="number"
                                   class="bulk-edit-partner-input"
                                   value="${value}"
                                   data-index="${idx}"
                                   data-month="${month.key}"
                                   style="width: 100px;"
                                   step="1000">
                        </td>
                    `;
                }).join('')}
            </tr>
        `;
    }).join('');

    // イベントリスナーを追加
    document.querySelectorAll('.bulk-edit-partner-input').forEach(input => {
        input.addEventListener('change', updateBulkEditPartnerData);
    });
}

function updateBulkEditPartnerData(event) {
    const input = event.target;
    const index = parseInt(input.dataset.index);

    if (input.dataset.field === 'company') {
        // 所属会社の更新
        bulkEditPartnerData[index].company = input.value;
    } else if (input.dataset.month) {
        // 月別原価の更新
        const monthKey = input.dataset.month;
        const value = parseFloat(input.value) || 0;

        if (!bulkEditPartnerData[index][monthKey]) {
            bulkEditPartnerData[index][monthKey] = {};
        }
        bulkEditPartnerData[index][monthKey].cost = value;
    }
}

function toggleSelectAllPartner() {
    const selectAll = document.getElementById('selectAllPartner');
    const checkboxes = document.querySelectorAll('.row-select-partner');

    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
}

function filterBulkEditPartnerTable() {
    const searchTerm = document.getElementById('bulkPartnerSearch').value.toLowerCase();
    const tbody = document.getElementById('bulkEditPartnerTableBody');
    const rows = tbody.querySelectorAll('tr');

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function saveBulkEditPartner() {
    if (!confirm('BP一括編集の内容を保存しますか？')) return;

    // 選択された行のみ保存するか、全て保存するか
    const selectedCheckboxes = document.querySelectorAll('.row-select-partner:checked');

    if (selectedCheckboxes.length > 0) {
        // 選択された行のみ更新
        if (!confirm(`選択された${selectedCheckboxes.length}件のBPデータを更新しますか？`)) return;

        selectedCheckboxes.forEach(checkbox => {
            const index = parseInt(checkbox.dataset.index);
            updatePartnerFromBulk(bulkEditPartnerData[index]);
        });
    } else {
        // 全データを更新
        if (!confirm('すべてのBPデータを更新しますか？')) return;

        bulkEditPartnerData.forEach(bp => {
            updatePartnerFromBulk(bp);
        });
    }

    saveToLocalStorage();
    renderPartnerTable();
    renderEmployeeTable(); // 社員売上タブも更新（BP含むため）
    updateDashboard();
    closeBulkEditPartnerModal();

    alert('BP一括編集を保存しました！');
}

function updatePartnerFromBulk(bp) {
    const bpIndex = partners.findIndex(p => p.id === bp.id);
    if (bpIndex !== -1) {
        partners[bpIndex].company = bp.company;
        MONTHS.forEach(month => {
            partners[bpIndex][month.key] = bp[month.key];
        });
        partners[bpIndex].updatedAt = new Date().toISOString();
    }
}

function closeBulkEditPartnerModal() {
    document.getElementById('bulkEditPartnerModal').classList.remove('active');
    document.getElementById('selectAllPartner').checked = false;
    bulkEditPartnerData = [];
}

// ========== 支出管理 ==========

function renderExpensesTab() {
    createExpenseMonthTabs();
}

function createExpenseMonthTabs() {
    const tabsContainer = document.getElementById('expenseMonthTabs');
    const contentsContainer = document.getElementById('expenseMonthContents');

    if (!tabsContainer || !contentsContainer) return;

    tabsContainer.innerHTML = '';
    contentsContainer.innerHTML = '';

    MONTHS.forEach((month, index) => {
        // タブ作成
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'month-tab' + (index === 0 ? ' active' : '');
        tab.textContent = `${month.year}年${month.label}`;
        tab.onclick = () => switchExpenseMonth(index);
        tabsContainer.appendChild(tab);

        // コンテンツ作成
        const content = document.createElement('div');
        content.className = 'month-content' + (index === 0 ? ' active' : '');
        content.id = `expense_month_${index}`;

        const expenseData = expenses[month.key] || { salary: 0, insurance: 0, personalExpense: 0 };

        content.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <label>給与支払（円）</label>
                    <input type="number" id="expense_${month.key}_salary" value="${expenseData.salary}"
                           step="1000" autocomplete="off" onchange="saveExpenseData()">
                </div>
                <div class="form-group">
                    <label>保険料※（円）</label>
                    <input type="number" id="expense_${month.key}_insurance" value="${expenseData.insurance}"
                           step="1000" autocomplete="off" onchange="saveExpenseData()">
                </div>
                <div class="form-group">
                    <label>個人経費（円）</label>
                    <input type="number" id="expense_${month.key}_personalExpense" value="${expenseData.personalExpense}"
                           step="1000" autocomplete="off" onchange="saveExpenseData()">
                </div>
            </div>
            <div class="info-box" style="margin-top: 15px;">
                <p><strong>自動計算</strong></p>
                <p id="expense_${month.key}_summary"></p>
            </div>
        `;
        contentsContainer.appendChild(content);
    });

    // 初期表示時に集計を更新
    updateExpenseSummaries();
}

function switchExpenseMonth(index) {
    document.querySelectorAll('#expenseMonthTabs .month-tab').forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
    });
    document.querySelectorAll('#expenseMonthContents .month-content').forEach((content, i) => {
        content.classList.toggle('active', i === index);
    });
}

function saveExpenseData() {
    MONTHS.forEach(month => {
        const salary = parseFloat(document.getElementById(`expense_${month.key}_salary`)?.value) || 0;
        const insurance = parseFloat(document.getElementById(`expense_${month.key}_insurance`)?.value) || 0;
        const personalExpense = parseFloat(document.getElementById(`expense_${month.key}_personalExpense`)?.value) || 0;

        expenses[month.key] = { salary, insurance, personalExpense };
    });

    updateExpenseSummaries();
    saveToLocalStorage();
    updateDashboard();
    updateMonthlyReport();
}

function updateExpenseSummaries() {
    MONTHS.forEach(month => {
        const summaryElement = document.getElementById(`expense_${month.key}_summary`);
        if (!summaryElement) return;

        // 社員売上合計
        let empRevenue = 0;
        employees.forEach(emp => {
            empRevenue += emp[month.key]?.revenue || 0;
        });

        // BP原価合計
        let bpCost = 0;
        partners.forEach(bp => {
            bpCost += bp[month.key]?.cost || 0;
        });

        const expenseData = expenses[month.key] || { salary: 0, insurance: 0, personalExpense: 0 };
        const totalExpense = expenseData.salary + expenseData.insurance + expenseData.personalExpense;

        const revenue = empRevenue + bpCost;
        const payment = totalExpense + bpCost;
        const profit = revenue - payment;

        summaryElement.innerHTML = `
            売上: ¥${revenue.toLocaleString()} = 社員売上 ¥${empRevenue.toLocaleString()} + BP原価 ¥${bpCost.toLocaleString()}<br>
            支払額: ¥${payment.toLocaleString()} = 支出計 ¥${totalExpense.toLocaleString()} + BP原価 ¥${bpCost.toLocaleString()}<br>
            <strong>粗利: ¥${profit.toLocaleString()}</strong>
        `;
    });
}

function copyExpenseToPreviousMonth() {
    const activeIndex = [...document.querySelectorAll('#expenseMonthTabs .month-tab')].findIndex(tab => tab.classList.contains('active'));
    if (activeIndex === 0) {
        alert('最初の月です。コピー元がありません。');
        return;
    }

    const prevMonth = MONTHS[activeIndex - 1];
    const currMonth = MONTHS[activeIndex];

    const prevData = expenses[prevMonth.key];
    document.getElementById(`expense_${currMonth.key}_salary`).value = prevData.salary;
    document.getElementById(`expense_${currMonth.key}_insurance`).value = prevData.insurance;
    document.getElementById(`expense_${currMonth.key}_personalExpense`).value = prevData.personalExpense;

    saveExpenseData();
    alert('前月のデータをコピーしました');
}

function copyExpenseToAllMonths() {
    const activeIndex = [...document.querySelectorAll('#expenseMonthTabs .month-tab')].findIndex(tab => tab.classList.contains('active'));
    const currMonth = MONTHS[activeIndex];

    const currData = expenses[currMonth.key];

    if (!confirm('現在の月のデータを全ての月にコピーしますか？')) return;

    MONTHS.forEach(month => {
        document.getElementById(`expense_${month.key}_salary`).value = currData.salary;
        document.getElementById(`expense_${month.key}_insurance`).value = currData.insurance;
        document.getElementById(`expense_${month.key}_personalExpense`).value = currData.personalExpense;
    });

    saveExpenseData();
    alert('全ての月にコピーしました');
}
