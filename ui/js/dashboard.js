$(document).ready(function () {
    const url = 'http://localhost:3000/'
    const getToken = () => {
        const token = sessionStorage.getItem('token');

        if (!token) {
            Swal.fire({
                icon: 'warning',
                text: 'You must be logged in to access this page.',
                showConfirmButton: true
            }).then(() => {
                window.location.href = 'login.html';
            });
            return;
        }
        return JSON.parse(token)
    }
    $.ajax({
        method: "GET",
        url: `${url}api/v1/address-chart`,
        dataType: "json",
        headers: {
            "Authorization": "Bearer " + getToken()
        },
        success: function (data) {
            // console.log(data);
            // const { values, labels } = data
            const { rows } = data
            // console.log(values, labels)
            var ctx = $("#addressChart");

            new Chart(ctx, {
                type: 'bar',
                data: {
                    // labels: ['taguig', 'tenment']
                    labels: rows.map(item => item.addressline),
                    datasets: [{
                        label: 'Number of Customers per town',
                        data: rows.map(item => item.total),
                        backgroundColor: () => {
                            //generates random colours and puts them in string

                            var colors = [];
                            for (var i = 0; i < rows.length; i++) {
                                var letters = '0123456789ABCDEF'.split('');
                                var color = '#';
                                for (var x = 0; x < 6; x++) {
                                    color += letters[Math.floor(Math.random() * 16)];
                                }
                                colors.push(color);
                            }
                            return colors;
                        },
                        borderColor: [
                            'rgb(255, 99, 132)',
                            'rgb(255, 159, 64)',
                            'rgb(255, 205, 86)',
                            'rgb(75, 192, 192)',
                            'rgb(54, 162, 235)',
                            'rgb(153, 102, 255)',
                            'rgb(201, 203, 207)'
                        ],
                        borderWidth: 1,

                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    },
                    // indexAxis: 'y',
                },
            });
        },
        error: function (error) {
            console.log(error);
        }
    });

    $.ajax({
        type: "GET",
        url: `${url}api/v1/sales-chart`,
        dataType: "json",
        headers: {
            "Authorization": "Bearer " + getToken()
        },
        success: function (data) {
            console.log(data);
            const { values, labels } = data
            const { rows } = data
            var ctx = $("#salesChart");
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: rows.map(item => item.month),
                    datasets: [{
                        label: 'Monthly sales',
                        data: rows.map(item => item.total),
                        backgroundColor: () => {
                            //generates random colours and puts them in string

                            var colors = [];
                            for (var i = 0; i < rows.length; i++) {
                                var letters = '0123456789ABCDEF'.split('');
                                var color = '#';
                                for (var x = 0; x < 6; x++) {
                                    color += letters[Math.floor(Math.random() * 16)];
                                }
                                colors.push(color);
                            }
                            return colors;
                        },

                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                },
            });

        },
        error: function (error) {
            console.log(error);
        }
    });

    $.ajax({
        type: "GET",
        url: `${url}api/v1/items-chart`,
        dataType: "json",
        headers: {
            "Authorization": "Bearer " + getToken()
        },
        success: function (data) {
            console.log(data);
            // const { values, labels } = data
            const { rows } = data
            var ctx = $("#itemsChart");
            new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: rows.map(item => item.items),
                    datasets: [{
                        label: 'number of items sold',
                        data: rows.map(item => item.total),

                        backgroundColor: () => {
                            //generates random colours and puts them in string

                            var colors = [];
                            for (var i = 0; i < rows.length; i++) {
                                var letters = '0123456789ABCDEF'.split('');
                                var color = '#';
                                for (var x = 0; x < 6; x++) {
                                    color += letters[Math.floor(Math.random() * 16)];
                                }
                                colors.push(color);
                            }
                            return colors;
                        },
                        borderColor: [
                            'rgba(75, 192, 192, 1)',
                            'rgba(255,99,132,1)'
                        ],
                        borderWidth: 1,
                        responsive: true,
                        // hoverBackgroundColor: colors,
                    }]
                },
                options: {
                    plugins: {
                        datalabels: {
                            backgroundColor: function (context) {
                                return context.dataset.backgroundColor;
                            },
                            borderColor: 'white',
                            borderRadius: 25,
                            borderWidth: 2,
                            color: 'white',
                            display: function (context) {
                                var dataset = context.dataset;
                                var count = dataset.data.length;
                                var value = dataset.data[context.dataIndex];
                                return value > count * 1.5;
                            },
                            font: {
                                weight: 'bold'
                            },
                            padding: 6,
                            formatter: Math.round
                        },
                        aspectRatio: 4 / 3,
                        cutoutPercentage: 32,
                        layout: {
                            padding: 32
                        },
                        elements: {
                            line: {
                                fill: false
                            },
                            point: {
                                hoverRadius: 7,
                                radius: 5
                            }
                        },
                    }
                }


            });

        },
        error: function (error) {
            console.log(error);
        }
    });
})
