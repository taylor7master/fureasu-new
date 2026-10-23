(function($) {
  var seriesLabels = ['1Q', '2Q', '3Q', '通期'];

  function thousandsSeparator(value) {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function parseCell(text) {
    var value = $.trim(text);
    if (value === '' || value === '-' || value === 'null') {
      return null;
    }
    var number = Number(value.replace(/,/g, ''));
    return isNaN(number) ? null : number;
  }

  function unitFromTitle(title) {
    if (title.indexOf('(円)') !== -1) {
      return '円';
    }
    if (title.indexOf('(%)') !== -1) {
      return '％';
    }
    return '百万円';
  }

  function readChart($section) {
    var labels = [];
    $section.find('.hl-table thead th').each(function(index) {
      if (index === 0) {
        return;
      }
      labels.push($.trim($(this).text()));
    });
    var rows = [];
    $section.find('.hl-table tbody tr').each(function() {
      var values = [];
      $(this).find('td').each(function() {
        values.push(parseCell($(this).text()));
      });
      rows.push(values);
    });
    return {
      labels: labels,
      rows: rows
    };
  }

  function barDataset(label, color, hover, data) {
    return {
      type: 'bar',
      label: label,
      backgroundColor: color,
      borderColor: 'rgba(0,0,0,0.4)',
      borderWidth: 0.5,
      hoverBackgroundColor: hover,
      hoverBorderColor: 'rgba(0,0,0,0.4)',
      data: data
    };
  }

  function lineDataset(label, borderColor, data) {
    return {
      type: 'line',
      label: label,
      backgroundColor: 'rgba(0,0,0,0)',
      borderColor: borderColor,
      borderWidth: 4,
      hoverBackgroundColor: 'rgba(0,0,0,0)',
      hoverBorderColor: borderColor,
      pointBackgroundColor: borderColor,
      pointBorderColor: borderColor,
      fill: false,
      lineTension: 0,
      spanGaps: false,
      data: data
    };
  }

  function buildDatasets(line, rows) {
    if (line) {
      return [
        lineDataset(seriesLabels[0], 'rgba(0,0,0,0.1)', rows[0]),
        lineDataset(seriesLabels[1], 'rgba(0,0,0,0.3)', rows[1]),
        lineDataset(seriesLabels[2], 'rgba(0,0,0,0.5)', rows[2]),
        lineDataset(seriesLabels[3], 'rgba(173, 26, 133, 1)', rows[3])
      ];
    }
    return [
      barDataset(seriesLabels[0], 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.4)', rows[0]),
      barDataset(seriesLabels[1], 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.4)', rows[1]),
      barDataset(seriesLabels[2], 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.4)', rows[2]),
      {
        type: 'bar',
        label: seriesLabels[3],
        backgroundColor: 'rgba(173, 26, 133, 1)',
        borderColor: 'rgba(173, 26, 133, 1)',
        borderWidth: 0.5,
        hoverBackgroundColor: 'rgba(173, 26, 133, .7)',
        hoverBorderColor: 'rgba(173, 26, 133, .7)',
        data: rows[3]
      }
    ];
  }

  function drawHighlightCharts($scope) {
    $scope.find('.hl-chart').each(function() {
      var $section = $(this);
      if (!$section.is(':visible')) {
        return;
      }
      var canvas = $section.find('.hl-graphset canvas')[0];
      if (!canvas) {
        return;
      }
      if (canvas._hlChart) {
        canvas._hlChart.resize();
        return;
      }
      var chart = readChart($section);
      var line = $section.hasClass('is-line');
      var labels = chart.labels;
      var rows = chart.rows;
      if (line) {
        labels = [''].concat(labels);
        rows = rows.map(function(row) {
          return [null].concat(row);
        });
      }
      var unit = unitFromTitle($section.find('.hl-chart-title').text());
      canvas._hlChart = new Chart(canvas.getContext('2d'), {
        type: line ? 'line' : 'bar',
        data: {
          labels: labels,
          datasets: buildDatasets(line, rows)
        },
        options: {
          responsive: true,
          tooltips: {
            callbacks: {
              label: function(tooltipItem) {
                return thousandsSeparator(tooltipItem.yLabel) + ' ' + unit;
              }
            }
          },
          scales: {
            yAxes: [{
              ticks: {
                fontSize: 10,
                userCallback: thousandsSeparator
              }
            }],
            xAxes: [{
              ticks: {
                fontSize: 10
              }
            }]
          },
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              fontSize: 10,
              padding: 20
            }
          },
          layout: {
            padding: {
              left: 100,
              right: 50,
              top: 0,
              bottom: 0
            }
          },
          elements: {
            line: {
              tension: 0
            }
          }
        }
      });
    });
  }

  $(function() {
    drawHighlightCharts($('.page-ir-highlight'));
  });

  $(document).on('click', '.page-ir-highlight .hl-tabs .tab', function() {
    var panel = $(this).attr('data-panel');
    var $panel = $(this).closest('.page-ir-highlight').find('.hl-panel[data-panel="' + panel + '"]');
    window.requestAnimationFrame(function() {
      drawHighlightCharts($panel);
    });
  });

  $(window).on('resize', function() {
    $('.page-ir-highlight canvas').each(function() {
      if (this._hlChart) {
        this._hlChart.resize();
      }
    });
  });
})(jQuery);
