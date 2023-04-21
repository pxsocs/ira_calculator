$(document).ready(function () {

    window.btcPrice = 0;

    // Bitcoin Scenarios
    window.scenarios = {
        'Bearish': {
            sixtyfourty_rate: 0.025,
            bitcoin_rate: 0.05,
        },
        'Base': {
            sixtyfourty_rate: 0.07,
            bitcoin_rate: 0.15,
        },
        'Bullish': {
            sixtyfourty_rate: 0.10,
            bitcoin_rate: 0.20,
        },
    }

    // Set initial scenario to 'Base'
    updateScenario('Base');

    // Hide Table
    $('#other-options').toggle();
    $('.hamburger').toggleClass('flipped');

    $('#toggle-button').on('click', function () {
        $('#other-options').toggle();
        $('.hamburger').toggleClass('flipped');
    });

    //  Update allocation slider text
    $("#allocation-slider").on("input", function () {
        window.allocation = parseInt($(this).val());
        $("#allocation-value").text($(this).val() + "%");
        calculate();
    });

    // Update Bitcoin and 60/40 slider text
    $("#bitcoin-slider, #sixtyfourty-slider").on("input", function () {
        window.sixtyfourtyReturn = parseInt($("#sixtyfourty-slider").val());
        window.bitcoinReturn = parseInt($("#bitcoin-slider").val());
        $("#bitcoin-return").text(window.bitcoinReturn + "%");
        $("#sixtyfourty-return").text(window.sixtyfourtyReturn + "%");
        calculate();
    });
    $("#bitcoin-slider, #sixtyfourty-slider, #allocation-slider").trigger("input");

    // Automatically adjust the width of the input fields to fit their content
    $('.ira-input, .ira-dropdown').each(function () {
        adjustInputWidth($(this));
    }).on('input change', function () {
        adjustInputWidth($(this));
    });

    // Update the maximum contribution amount when age or income input changes
    $('#age, #income').on('input change', function () {
        const age = parseInt($('#age').val());
        const income = parseFloat($('#income').val().replace(/[$,]/g, ''));
        updateMaxContribution(age, income);
        calculate();
    });

    // Run the calculations on initial page load
    calculate();


    // Run the calculations when input values change
    $('.ira-input, .ira-dropdown').on('input change', function () {
        calculate();
    });

    // Fetch Latest BTC_Price
    fetch("/realtime_btc")
        .then((response) => response.json())
        .then((data) => {
            window.btcPrice = data.btc_usd;
            calculate();
        });



    // Create buttons for each scenario
    const buttonGroup = $('<div class="btn-group d-flex mb-3" role="group" aria-label="Scenarios"></div>');
    for (const scenario in scenarios) {
        const button = $(`<button type="button" class="btn btn-outline-dark w-100" id="${scenario.toLowerCase()}-btn">${scenario}</button>`);
        button.on('click', () => {
            updateScenario(scenario);
        });
        buttonGroup.append(button);
    }
    $('#scenario_buttons').append(buttonGroup); // Replace 'body' with the selector for the container you want to insert the buttons into
    updateScenario(window.scenario)

});

function updateScenario(scenario) {
    window.scenario = scenario
    // Update button styles
    $('.btn-outline-dark').removeClass('selected-scenario');
    $(`#${scenario.toLowerCase()}-btn`).addClass('selected-scenario');

    // Retrieve scenario data
    const { sixtyfourty_rate, bitcoin_rate } = window.scenarios[window.scenario];

    // Update slider values and text
    window.sixtyfourtyReturn = parseInt(sixtyfourty_rate * 100);
    window.bitcoinReturn = parseInt(bitcoin_rate * 100);
    $("#bitcoin-return").text(window.bitcoinReturn + "%");
    $("#sixtyfourty-return").text(window.sixtyfourtyReturn + "%");
    $("#bitcoin-slider").val(window.bitcoinReturn);
    $("#sixtyfourty-slider").val(window.sixtyfourtyReturn);


    calculate();

}


function calculate() {
    // Retrieve input values
    const age = parseInt($('#age').val());
    const income = 100000;
    const savings = parseFloat($('#savings').val().replace(/,/g, ''));
    const retirementAge = 67;
    const annualContribution = parseFloat($('#annualContribution').val().replace(/,/g, ''));
    const taxStatus = "single"

    $("#btc_price").text(formatNumber(window.btcPrice, 0, '$'));

    // Update the maximum contribution amount
    updateMaxContribution(age, income);

    // Calculate tax savings
    const effectiveTaxRate = calculateEffectiveTaxRate(taxStatus, income);

    // Display the effective tax rate
    $('#effectiveTaxRate').text((effectiveTaxRate * 100).toFixed(2));

    let iraValue = savings;

    // Generate table data
    const tableBody = $('#comparison-table tbody');
    tableBody.empty();

    let taxableValue = savings;

    // Define starting Bitcoin price and expected annual growth rate
    const startingBitcoinPrice = window.btcPrice;

    let years = ['NOW'];
    let bitcoinPrices = [startingBitcoinPrice];
    let btcNormalizedList = [startingBitcoinPrice];
    let iraValues = [savings];
    let fullIra = [savings];
    let iraPrices = [100]
    let iraPrice = 100
    let fullIraValue = savings
    let sixtyfourtyValues = [100];
    let taxableValues = [savings * (1 - effectiveTaxRate)];
    let difference = 0;


    for (let year = age + 1; year <= retirementAge; year++) {
        // Save the previous year's IRA value
        ira_previous = iraPrice;
        fIrra_previous = fullIraValue;
        fullIraValue += annualContribution;
        iraValue += annualContribution;
        // Calculate bitcoin Price this year
        const btcPrice = startingBitcoinPrice * (1 + window.bitcoinReturn / 100) ** (year - age);
        // Calculate 60/40 Price this year
        const sixtyfourtyPrice = 100 * (1 + window.sixtyfourtyReturn / 100) ** (year - age);
        // Calculate Normalized Bitcoin Price this year
        btcNormalized = btcPrice / startingBitcoinPrice * 100;
        // Calculate IRA normalized Price this year
        iraPrice = btcNormalized * window.allocation / 100 + sixtyfourtyPrice * (100 - window.allocation) / 100;

        // Calculate IRA Value this year
        iraValue = iraPrice / ira_previous * iraValue;
        // Calculate Full IRA Value this year
        fullIraValue = (1 + (window.sixtyfourtyReturn / 100)) * fullIraValue;

        // Calculate taxable values
        taxableDisplayValue = iraValue * (1 - effectiveTaxRate);

        // Save arrays for chart
        years.push(year);
        bitcoinPrices.push(btcPrice);
        btcNormalizedList.push(btcNormalized);
        iraValues.push(iraValue);
        fullIra.push(fullIraValue);
        taxableValues.push(taxableDisplayValue);


        difference = iraValue - taxableDisplayValue;
        bitcoindiff = iraValue - fullIraValue;

    }

    // Display calculated values
    $('#ira-balance').text(formatNumber(iraValue, 0));
    $('#taxable-balance').text(formatNumber(taxableDisplayValue, 0));
    $('#savings-balance').html("<i class='fa-solid fa-caret-up fa-sm text-muted'></i>&nbsp;$ " + formatNumber(difference, 0));
    $('#bitcoin-balance').html("<i class='fa-solid fa-caret-up fa-sm text-muted'></i>&nbsp;$ " + formatNumber(bitcoindiff, 0));

    // Update Max Contribution
    updateMaxContribution(age, income);


    createChart(years, iraValues, fullIra, taxableValues);
}



function adjustInputWidth(input) {
    const tempSpan = $('<span></span>');
    tempSpan.text(input.val());
    tempSpan.css('font-size', input.css('font-size'));
    tempSpan.css('font-family', input.css('font-family'));
    tempSpan.css('visibility', 'hidden');
    $('body').append(tempSpan);

    input.css('width', (tempSpan.outerWidth() + 40) + 'px');

    tempSpan.remove();
}

function calculateEffectiveTaxRate(taxStatus, income) {
    const brackets = taxBrackets[taxStatus];
    let tax = 0;
    let prevThreshold = 0;

    for (const bracket of brackets) {
        const taxableIncomeInBracket = Math.min(income, bracket.threshold) - prevThreshold;
        tax += taxableIncomeInBracket * bracket.rate;
        prevThreshold = bracket.threshold;
        if (income <= bracket.threshold) {
            break;
        }
    }

    return tax / income;
}



function updateMaxContribution(age, income) {
    const baseMaxContribution = age >= 50 ? 7500 : 6500;
    $('#annual_cont_max').text(formatNumber(baseMaxContribution, 0));
}




function createChart(years, iraValues, fullIra, taxableValues) {
    Highcharts.chart('chart-container', {
        chart: {
            type: 'line',
            backgroundColor: null,
            events: {
                load: function () {
                    this.renderer.image('/static/images/swan-logo-primary.png',
                        this.chartWidth / 2 - 250,
                        this.chartHeight / 2 - 90,
                        500, 180
                    ).css({
                        opacity: 0.1
                    }).add();
                }
            }
        },
        title: {
            text: ''
        },
        credits: {
            enabled: false
        },
        xAxis: {
            categories: years,
            labels: {
                formatter: function () {
                    return this.value === years[0] ? 'NOW' : Highcharts.numberFormat(this.value, 0, '.', '');
                },
                style: {
                    fontSize: '14px'
                }
            }
        },
        yAxis: {
            title: {
                text: 'Balance'
            },
            labels: {
                formatter: function () {
                    return this.value >= 1000000 ? (this.value / 1000000) + 'M' : (this.value / 1000) + 'K';
                },
                style: {
                    fontSize: '14px'
                }
            },
        },
        tooltip: {
            shared: true,
            pointFormat: '<span style="color:{series.color}">{series.name}: </span><b>${point.y:,.0f}</b><br/>'
        },
        plotOptions: {
            series: {
                animation: false
            },
            line: {
                stacking: false,
                marker: {
                    enabled: false
                },
                lineWidth: 1
            }
        },
        series: [{
            name: 'IRA with ₿ Value',
            data: iraValues,
            color: '#FCC800',
            // set width of line to 4px
            lineWidth: 4,
            marker: {
                enabled: false,
            },
            dataLabels: {
                enabled: true,
                formatter: function () {
                    if (this.point.index === this.series.data.length - 1) {
                        return ` IRA with ${formatNumber(window.allocation, 0)}% ₿: $${formatNumber(this.y, 0)} ►&nbsp;&nbsp;&nbsp;`;
                    }
                    return null;
                },
                style: {
                    font: 'normal 18px "Roboto", arial',
                    fontWeight: 'strong',
                    fontSize: '18px',
                    color: '#00274F',
                },
                y: 20,
                backgroundColor: 'transparent',
                padding: 5
            },
        }, {
            name: 'IRA without ₿ Value',
            data: fullIra,
            color: '#ED8C8C',
            lineWidth: 4,
            marker: {
                enabled: false,
            },
            dataLabels: {
                enabled: true,
                formatter: function () {
                    if (this.point.index === this.series.data.length - 1) {
                        return `Without ₿: $${formatNumber(this.y, 0)} ►&nbsp;&nbsp;&nbsp;`;
                    }
                    return null;
                },
                style: {
                    font: 'normal 18px "Roboto", arial',
                    fontWeight: 'strong',
                    fontSize: '18px',
                    color: '#00274F',
                },
                y: 20,
                backgroundColor: 'transparent',
                padding: 5
            },

        }
        ],
        legend: {
            enabled: true
        },
    });
}



// Notes:
// Include bear (5%), base (15%) and bullish (30%)
// Based on Schrodinger's Cat
// Provider
// Assumptions: Zero in Bitcoin
// Slider from 60/40 to Bitcoin
// Remainder in 60/40 Portfolio
// Assume contributions going forward


const taxBrackets = {
    single: [
        { threshold: 9950, rate: 0.10 },
        { threshold: 40525, rate: 0.12 },
        { threshold: 86375, rate: 0.22 },
        { threshold: 164925, rate: 0.24 },
        { threshold: 209425, rate: 0.32 },
        { threshold: 523600, rate: 0.35 },
        { threshold: Infinity, rate: 0.37 },
    ],
    married_filing_separately: [
        { threshold: 9950, rate: 0.10 },
        { threshold: 40525, rate: 0.12 },
        { threshold: 86375, rate: 0.22 },
        { threshold: 164925, rate: 0.24 },
        { threshold: 209425, rate: 0.32 },
        { threshold: 314150, rate: 0.35 },
        { threshold: Infinity, rate: 0.37 },
    ],
    married_filing_jointly: [
        { threshold: 19900, rate: 0.10 },
        { threshold: 81050, rate: 0.12 },
        { threshold: 172750, rate: 0.22 },
        { threshold: 329850, rate: 0.24 },
        { threshold: 418850, rate: 0.32 },
        { threshold: 628300, rate: 0.35 },
        { threshold: Infinity, rate: 0.37 },
    ],
    head_of_household: [
        { threshold: 14100, rate: 0.10 },
        { threshold: 53700, rate: 0.12 },
        { threshold: 85525, rate: 0.22 },
        { threshold: 163300, rate: 0.24 },
        { threshold: 207350, rate: 0.32 },
        { threshold: 518400, rate: 0.35 },
        { threshold: Infinity, rate: 0.37 },
    ],
};


