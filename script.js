/// <reference path="jquery-3.6.0.js" />

$(() => {
    localStorage.clear();//clears data in LS from prev uses of the sw
    let array_of_toggeled = [];
    let array_of_coins = [];
    show_all_coins();//when website loaded will show th elist of coins

    //returns promise with url
    function get_coins_from_website(url) {
        return new Promise((resolve, reject) => {
            $.ajax({
                method: "GET",
                url: url,
                success: data => resolve(data),
                error: e => reject(e),
            });
        });
    }

    //function called for each coin to display its card - also used by search
    function createAndShowCard(coin) {
        const coin_id = coin.id;
        const coin_symbol = coin.symbol;
        const card = $(`<div id="${coin_id}" class="col-sm-12 col-lg-4 card my_card"></div>`);
        card.append(`<div class="custom-control custom-switch"><input type="checkbox" id="input_chk_toggle_${coin_id}" class="custom-control-input my_toggle_checkbox"><label class="custom-control-label my_toggle" for="input_chk_toggle_${coin_id}" ></label></div>`);
        card.append(`<h1>${coin_symbol}</h1>`);
        card.append(`<p>${coin_id}</p>`);
        card.append(`<button data-toggle="collapse" data-target="#demo_${coin_id}" class="my_collapse btn btn-primary">More Info</button>`);
        card.append(`<div id="demo_${coin_id}" class="collapse my_collapse"></div>`);
        $("#show_content").append(card);
        if (array_of_toggeled.find(coin => coin.id == coin_id)) {
            $(`#input_chk_toggle_${coin_id}`).prop('checked', true);
        }

    }

    //function called when need to show all coins
    async function show_all_coins() {
        try {
            const url = `https://api.coingecko.com/api/v3/coins/list`;
            const try_promise = get_coins_from_website(url);
            const list_of_coins = await try_promise;
            for (let i = 0; i < 100; i++) {
                array_of_coins.push(list_of_coins[i]);
                createAndShowCard(list_of_coins[i]);
            }

        }
        catch (e) {
            alert(`Error in ajax request: ${e.status} - ${e.statusText}`);
        }
    }

    //when waiting for data will display progress bar
    function display_progress_bar(this_id) {
        $(`#demo_${this_id}`).append(`
        <div class="progress" style="width:100%" id="outer_progress">
            <div id="inner_progress" class="progress-bar" style="width:0%; background-color:rgb(33, 33, 58);"></div>
        </div>
        `);
        let progress = 0;
        var interval = setInterval(() => {
            progress += 10;
            if (progress <= 100) {
                $("#inner_progress").width(`${progress}%`);
                $("#inner_progress").text(`${progress}%`);
            }
            else
                clearInterval(interval);
        }, 5);
    }

    //called when data comes in - in order to end interval
    async function end_progress_bar() {
        $("#inner_progress").width(`100%`);
        $("#inner_progress").text(`100%`);
    }

    //function called when neccessary to remove an item form the array of toggled coins
    function remove_item_from_array(id) {
        const index = array_of_toggeled.findIndex(coin => coin.id == id);
        if (index !== -1) {
            array_of_toggeled.splice(index, 1);
        }
    }

    //function called when popup needs to be displayed
    function show_popup() {
        $('#my_modal').html("");
        for (let coin of array_of_toggeled) {
            $('#my_modal').append(`<div id="modal_${coin.id}" class="col-sm-12 col-lg-12 card my_card my_card_modal"><h6>${coin.symbol}</h6><p>${coin.id}</p><div class="custom-control custom-switch"><input type="checkbox" id="input_chk_toggle_modal_${coin.id}" class="custom-control-input" ><label  class="custom-control-label my_toggle_from_modal" for="input_chk_toggle_modal_${coin.id}"></label></div></div>`);
            $(`#input_chk_toggle_modal_${coin.id}`).prop("checked", true);
        }
        $('#my_modal').append(`<button type="button" id="close_modal" class="btn btn-primary">Close</button>`);
        $('.modal').modal({
            backdrop: 'static',
            keyboard: true,
            show: true
        });
    }

    //function called when popup is closed
    //checkes if the popup was closed from a toggle swith being turned off or the close button
    function close_popup() {
        $('.modal').modal('hide');
        const sixth_toggeled_ls = JSON.parse(localStorage.sixthToggeled);
        if (array_of_toggeled.length == 5) {//was closed from button - in this case the sixth one will be turned off
            $(`#input_chk_toggle_${sixth_toggeled_ls}`).prop("checked", false);
        }
        else {//closed from toggle - sixth added to array and is marked as checked
            $(`#input_chk_toggle_${sixth_toggeled_ls}`).prop("checked", true);
            array_of_toggeled.push(array_of_coins.find(coin => coin.id == sixth_toggeled_ls));
        }
    }

    //Navigation Home button clicked
    $('#btn_nav_home').on("click", function () {
        clearInterval();//clears running interval of live reports if there is an open one
        $('#show_content').html("");//clears existing html display on main div 
        show_all_coins();
    });

    //event triggered when "more info" button clicked
    $(document).on('show.bs.collapse', '.my_collapse', async function () {
        const this_id = $(this).parent().attr('id');//gets id of card that the button on it was clicked
        display_progress_bar(this_id);
        let image, usd, eur, ils;
        if (localStorage.getItem(`${this_id}`) !== null) {//if there is info for this coin in LS - sw does not call API
            end_progress_bar();
            const coin_ls = JSON.parse(localStorage.getItem(`${this_id}`));
            usd = coin_ls.usd;
            ils = coin_ls.ils;
            eur = coin_ls.eur;
            image = coin_ls.image;
        }
        else {//noo info for this coin in LS
            try {
                const url = `https://api.coingecko.com/api/v3/coins/${this_id}`;
                const try_promise = get_coins_from_website(url);
                const coin_info = await try_promise;//gets info from API
                end_progress_bar();//when success called progress bar is set to 100%
                usd = coin_info.market_data.current_price.usd;
                ils = coin_info.market_data.current_price.ils;
                eur = coin_info.market_data.current_price.eur;
                image = coin_info.image.thumb;
                localStorage.setItem(`${this_id}`, JSON.stringify({ symbol: coin_info.symbol, image: image, usd: usd, ils: ils, eur: eur, ttl: Date.now() + (12 * 1000) }));
                const t = setTimeout(function () {
                    localStorage.removeItem(this_id);
                }, 120 * 1000);//once info comes from API it is saved in LS for 2 minutes
            }
            catch (e) {
                alert(`Error in ajax request: ${e.status} - ${e.statusText}`);
            }
        }
        $(`#demo_${this_id}`).html("");
        $(`#demo_${this_id}`).append(`
                    <img src="${image}" alt="image">
                    <p>${usd}$</p>
                    <p>${ils}₪</p>
                    <p>${eur}€</p>
            `);//adds more info to display
    });

    //search button on nav bar searching all coins that are showing on the page e.g. the ones that were brought from the server and displayed
    //for developing perpuses only 100 are displayed
    $(document).on('click', '#btn_nav_search', function () {
        const search_value = $('#input_feild_search').val();
        const found_coins = array_of_coins.find(coin => coin.symbol == search_value);
        if (found_coins) {
            $('#show_content').html('');
            createAndShowCard(found_coins);
        }
        else {
            alert("Did not find info that matches your search!!");
        }
    });

    //event triggered when toggle switch clicked
    $(document).on('click', '.my_toggle', function () {
        const this_id = $(this).parent().parent().attr('id');//gets id of card that the button on it was clicked
        //const toggle_state = $(`#toggle_${this_id}`);
        if (!$(`#input_chk_toggle_${this_id}`).prop('checked')) {//check if the click was turning on the switch or turning it off
            //if it is turning it on
            if (array_of_toggeled.length < 5) {//if it is not the sixth one - adds it to array
                array_of_toggeled.push(array_of_coins.find(coin => coin.id == this_id));
            }
            else {//if it is the sixth one - showes popup, and in order to remember it saves the id in LS
                localStorage.sixthToggeled = JSON.stringify(this_id);
                show_popup();//popup
            }
        }
        else {
            //if toggle was turned off the item is removed from array of toggled coins
            remove_item_from_array(this_id);
        }
    });

    //event triggered when toggle in modal is clicked
    $(document).on('click', '.my_toggle_from_modal', function () {
        let modal_id = $(this).parent().parent().attr('id');
        modal_id = modal_id.slice(6);//removes the begining of the id that is the word modal_ in order to get the id
        $(`#input_chk_toggle_${modal_id}`).prop("checked", false);
        remove_item_from_array(modal_id);//removes the one turned off from array
        close_popup();
    });

    //event triggered when modal is closed by button 
    $(document).on('click', '#close_modal', function () {
        close_popup();
    });

    //Navigation Home button clicked
    $('#btn_nav_about').on("click", function () {
        clearInterval();
        $('#show_content').html("");
        $('#show_content').append(`<h5>Batsheva Kahan</h5><h6>Full-stack Engineer</h6><p>This website will show you all virtual coins in the market, and there currency<br>You can also see a live report of each coin selected (you can select up to 5 coins to view a live report on at once)<br>Enjoy!!</p>`)
    });

    //since header is transparent I couldn't make it stickey wothout showing info under it when scrolling
    //to solve that I added a button that anytime will return the user to the menu on the top in an easy way
    //the two function below do that
    $(window).on("scroll", function () {
        if (document.body.scrollTop > 1 || document.documentElement.scrollTop > 1) {
            $('#scroll_to_top').css('display', 'block');
        } else {
            $('#scroll_to_top').css('display', 'none');
        }
    });

    $('#scroll_to_top').on("click", function () {
        document.body.scrollTop = 0;//for safari
        document.documentElement.scrollTop = 0;//for other browsers
    });

    //Bonus
    $('#btn_nav_live_reports').on("click", async function () {
        $('#show_content').html("");
        let url = `https://min-api.cryptocompare.com/data/pricemulti?fsyms=`;
        let name_of_graph = "";
        var options = {
            axisX: {
                title: ""
            },
            axisY: {
                title: "Coins value",
                suffix: "$"
            },
            toolTip: {
                shared: true
            },
            data: []
        };
        if (array_of_toggeled.length == 0) {//if no coins were toggled on
            alert(`No Coins are chosen for Live reports!!`);
        } else {
            //creates the name of the chart and the url that will be sent to the api - using the array of toggled coins
            for (const coin of array_of_toggeled) {
                url += `${coin.symbol},`;
                name_of_graph += `${coin.symbol}, `;
            }
            url += `&tsyms=USD`;
            name_of_graph = name_of_graph.substring(0, name_of_graph.length - 2);
            options.title = {text:`${name_of_graph} to USD`};
            try {
                promise = get_coins_from_website(url);
                let report = await promise;//gets info from API
                for (let key in report) {//adds each one separatly to the data - so that each one has a separate graph
                    options.data.push({
                        type: "line",
                        xValueType: "dateTime",
                        yValueFormatString: "#####.#####$",
                        xValueFormatString: "hh:mm:ss TT",
                        showInLegend: true,
                        legendText: key,
                        name: key,
                        dataPoints: [],
                    });
                }
            }
            catch (e) {
                alert(`Error in ajax request: ${e.status} - ${e.statusText}`);
            }
            $("#show_content").CanvasJSChart(options);//shows the canvas without graphs yet
            var updateInterval = 2000;
            var time = new Date;
            async function updateChart(count) {//function called in an interval
                //var time = new Date;
                count = count || 1;
                for (var i = 0; i < count; i++) {
                    time.setTime(time.getTime() + updateInterval);//updates time 
                    try {
                        const promise = get_coins_from_website(url);
                        let report_interval = await promise;//gets info from API
                        for (let key in report_interval) {//adds the currency that comes in from the API
                            yValue = report_interval[key].USD;
                            let array = options.data;
                            let temp = array.findIndex( i => i.name == key);
                            options.data[temp].dataPoints.push({
                                x: time.getTime(),
                                y: yValue,
                            });
                        }
                    }
                    catch (e) {
                        alert(`Error in ajax request: ${e.status} - ${e.statusText}`);
                    }
                    
                }
                $("#show_content").CanvasJSChart().render();//updates the chart
            }
            updateChart(100);
            setInterval(function () { updateChart() }, updateInterval);
        }
    });
});