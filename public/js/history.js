/**
 * VietFuel API
 * Copyright (c) 2026 TranQui
 * Github: https://github.com/TranQui004
 *
 * Licensed under the MIT License.
 * See LICENSE file for details.
 */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('historyTableBody');
  const errorIndicator = document.getElementById('historyErrorIndicator');
  const loadingIndicator = document.getElementById('chartLoading');
  
  let chartInstance = null;

  // Khởi tạo ApexCharts với config mặc định (Biểu đồ Cột Nhóm)
  const initChart = () => {
    const options = {
      chart: {
        type: 'bar',
        height: 400,
        animations: { enabled: true, easing: 'easeinout', speed: 800 },
        toolbar: { show: true, tools: { download: true, selection: false, zoom: false, pan: false } },
        background: 'transparent',
        fontFamily: 'Be Vietnam Pro, sans-serif'
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '60%',
          endingShape: 'rounded',
          borderRadius: 4
        }
      },
      dataLabels: { enabled: false },
      colors: ['#ff6300', '#0088cc'],
      stroke: { show: true, width: 2, colors: ['transparent'] },
      series: [],
      xaxis: {
        categories: [], // Sẽ được cập nhật từ API
        labels: { 
          style: { colors: 'var(--text-muted)' },
          formatter: (val) => val ? new Intl.NumberFormat('vi-VN').format(val) + ' ₫' : val
        }
      },
      yaxis: {
        labels: {
          style: { colors: 'var(--text-muted)' }
        }
      },
      grid: { borderColor: 'var(--border-color)', strokeDashArray: 4 },
      theme: { mode: document.documentElement.getAttribute('data-theme') || 'dark' },
      tooltip: {
        theme: document.documentElement.getAttribute('data-theme') || 'dark',
        y: { formatter: (val) => new Intl.NumberFormat('vi-VN').format(val) + ' ₫' }
      },
      legend: { position: 'top', horizontalAlign: 'center', labels: { colors: 'var(--text-secondary)' } }
    };

    chartInstance = new ApexCharts(document.querySelector("#priceChart"), options);
    chartInstance.render();
  };

  // Cập nhật theme biểu đồ khi người dùng đổi Dark/Light mode
  const updateChartTheme = () => {
    if (chartInstance) {
      const mode = document.documentElement.getAttribute('data-theme') || 'dark';
      chartInstance.updateOptions({ theme: { mode }, tooltip: { theme: mode } });
    }
  };

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'data-theme') updateChartTheme();
    });
  });
  observer.observe(document.documentElement, { attributes: true });

  const formatPrice = (val) => val ? new Intl.NumberFormat('vi-VN').format(val) : '—';
  
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const normalizeName = (name = '') => {
    let n = name.toLowerCase().replace(/\s+/g, ' ').trim();
    if (n.includes('sinh học') || n.includes('không chì')) {
      n = n.replace('sinh học ', '').replace('không chì ', '');
    }
    n = n.replace(' mức 2', '-ii').replace(' mức 3', '-iii').replace(' mức 5', '-v');
    n = n.replace(/-2\b/g, '-ii').replace(/-3\b/g, '-iii').replace(/-5\b/g, '-v');
    if (n.includes('điêzen') || n.includes('diezel') || n.includes('dầu do')) {
      n = n.replace(/dầu điêzen|điêzen|diezel|dầu do/g, 'dầu do');
    }
    n = n.replace(/0\.05/g, '0,05').replace(/0\.001/g, '0,001');
    return n.replace(/\s+-/g, '-').trim();
  };

  const formatFuelName = (name) => {
    return name
      .replace('xăng', 'Xăng')
      .replace('dầu do', 'Dầu DO')
      .replace('dầu điêzen', 'Dầu Điêzen')
      .replace('dầu hỏa', 'Dầu Hỏa')
      .replace('dầu mazut', 'Dầu Mazut')
      .replace(/ron/i, 'RON')
      .replace(/e5/i, 'E5')
      .replace(/e10/i, 'E10')
      .replace(/-ii\b/i, '-II')
      .replace(/-iii\b/i, '-III')
      .replace(/-v\b/i, '-V')
      .replace(/0,05s/i, '0,05S')
      .replace(/0,001s/i, '0,001S');
  };

  let globalLatestTableData = [];
  let currentSort = { column: 'source', direction: 'asc' };
  
  const FUEL_ORDER = ['xăng ron 95-v', 'xăng ron 95-iii', 'xăng e10 ron 95-iii', 'xăng e5 ron 92-ii', 'do 0,001s-v', 'do 0,05s-ii', 'dầu hỏa 2-k'];

  const getFuelClass = (name) => {
    if (!name) return '';
    const n = name.toLowerCase();
    if (n.includes('ron 95-v')) return 'ron95-v';
    if (n.includes('ron 95')) return 'ron95';
    if (n.includes('e5')) return 'e5';
    if (n.includes('do')) return 'do';
    if (n.includes('hỏa')) return 'hoa';
    return '';
  };

  const renderTable = () => {
    tableBody.innerHTML = '';
    const filterVal = document.getElementById('sourceFilter').value;
    
    let filteredData = globalLatestTableData;
    if (filterVal !== 'all') {
      filteredData = filteredData.filter(r => r.source === filterVal);
    }

    filteredData.sort((a, b) => {
      let valA = a[currentSort.column];
      let valB = b[currentSort.column];

      if (currentSort.column === 'fuel_name') {
        let ia = FUEL_ORDER.indexOf(normalizeName(a.fuel_name));
        let ib = FUEL_ORDER.indexOf(normalizeName(b.fuel_name));
        if (ia === -1) ia = 99;
        if (ib === -1) ib = 99;
        if (ia !== ib) return currentSort.direction === 'asc' ? ia - ib : ib - ia;
        valA = a.fuel_name;
        valB = b.fuel_name;
      }

      if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
      if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
      return 0;
    });

    filteredData.forEach((row, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="text-align: center; background-color: var(--bg-surface); position: sticky; left: 0; z-index: 10;">${index + 1}</td>
        <td style="text-align: center;">${formatDate(row.price_date)}</td>
        <td style="text-align: left;"><span class="fuel-name ${getFuelClass(row.fuel_name)}">${row.fuel_name}</span></td>
        <td class="price-cell" style="text-align: right;">${formatPrice(row.region1)}</td>
        <td class="price-cell price-region2" style="text-align: right;">${formatPrice(row.region2)}</td>
        <td style="text-align: center;"><span class="lsc-value" style="font-size:0.8rem">${row.source}</span></td>
      `;
      tableBody.appendChild(tr);
    });
    
    // Update sort icons
    document.querySelectorAll('th[data-sort] .sort-icon').forEach(icon => {
      icon.textContent = '↕';
      icon.style.opacity = '0.3';
    });
    const activeTh = document.querySelector(`th[data-sort="${currentSort.column}"]`);
    if (activeTh) {
      const icon = activeTh.querySelector('.sort-icon');
      icon.textContent = currentSort.direction === 'asc' ? '▲' : '▼';
      icon.style.opacity = '1';
    }
    errorIndicator.style.display = 'none';
  };

  // Load dữ liệu
  const loadStatistics = async () => {
    loadingIndicator.style.display = 'flex';
    errorIndicator.style.display = 'none';
    tableBody.innerHTML = ''; 

    // Lấy dữ liệu API (dùng limit lớn để đảm bảo lấy đủ các nguồn)
    const apiUrl = window.location.origin + `/api/history?limit=500`;

    try {
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error('API Response not ok');
      const json = await res.json();
      
      if (!json.success || !json.data || json.data.length === 0) {
        throw new Error('No data');
      }

      const tableData = [...json.data];
      
      // Lấy dữ liệu mới nhất của TẤT CẢ các nguồn để hiển thị bảng
      const seen = new Set();
      globalLatestTableData = [];
      tableData.forEach(row => {
        const norm = normalizeName(row.fuel_name);
        const key = `${row.source}-${norm}`;
        if (!seen.has(key)) {
          seen.add(key);
          // Gán lại tên chuẩn hóa cho hiển thị trong bảng
          row.fuel_name = formatFuelName(norm);
          globalLatestTableData.push(row);
        }
      });
      
      // Tạo dữ liệu cho Biểu đồ (Gộp tất cả nhiên liệu từ các nguồn)
      const chartFuelMap = new Map();
      globalLatestTableData.forEach(row => {
        const normName = normalizeName(row.fuel_name);
        if (!chartFuelMap.has(normName)) {
            chartFuelMap.set(normName, { name: normName, region1: row.region1, region2: row.region2, source: row.source });
        } else {
            // Ưu tiên ghi đè nếu dòng hiện tại là petrolimex
            if (row.source === 'petrolimex') {
                chartFuelMap.set(normName, { name: normName, region1: row.region1, region2: row.region2, source: row.source });
            }
        }
      });

      const categories = [];
      const v1Data = [];
      const v2Data = [];

      const mergedChartData = Array.from(chartFuelMap.values());
      mergedChartData.sort((a, b) => {
        let ia = FUEL_ORDER.indexOf(a.name);
        let ib = FUEL_ORDER.indexOf(b.name);
        if (ia === -1) ia = 99;
        if (ib === -1) ib = 99;
        return ia - ib;
      }).forEach(item => {
        categories.push(item.name.toUpperCase());
        v1Data.push(item.region1);
        v2Data.push(item.region2);
      });

      chartInstance.updateOptions({
        xaxis: { categories: categories },
        chart: {
          height: Math.max(350, categories.length * 35) // dynamic height
        },
        title: {
          text: `Thống kê ${categories.length} sản phẩm`,
          align: 'center',
          style: { color: 'var(--text-primary)', fontFamily: 'Be Vietnam Pro', fontSize: '14px', fontWeight: 600 }
        }
      });
      chartInstance.updateSeries([
        { name: 'Vùng 1', data: v1Data },
        { name: 'Vùng 2', data: v2Data }
      ]);
      
      // Populate dropdown filter
      const filterSelect = document.getElementById('sourceFilter');
      const uniqueSources = [...new Set(globalLatestTableData.map(r => r.source))].sort();
      // Remove old options except the first one
      while (filterSelect.options.length > 1) {
        filterSelect.remove(1);
      }
      uniqueSources.forEach(src => {
        const opt = document.createElement('option');
        opt.value = src;
        opt.textContent = src.toUpperCase();
        filterSelect.appendChild(opt);
      });

      renderTable();

    } catch (error) {
      console.error(error);
      errorIndicator.style.display = 'flex';
    } finally {
      loadingIndicator.style.display = 'none';
    }
  };

  // Events cho sorting và filtering
  document.getElementById('sourceFilter').addEventListener('change', () => {
    currentSort = { column: 'fuel_name', direction: 'asc' }; // Reset sort
    renderTable();
  });

  document.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const column = th.getAttribute('data-sort');
      if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
      }
      renderTable();
    });
  });

  // Init
  initChart();
  loadStatistics();
});
