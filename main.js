const mapStyle = [{
    'featureType': 'administrative',
    'elementType': 'all',
    'stylers': [{
      'visibility': 'on',
    },
    {
      'lightness': 33,
    },
    ],
  },
  {
    'featureType': 'landscape',
    'elementType': 'all',
    'stylers': [{
      'color': '#f2e5d4',
    }],
  },
  {
    'featureType': 'poi.park',
    'elementType': 'geometry',
    'stylers': [{
      'color': '#c5dac6',
    }],
  },
  {
    'featureType': 'poi.park',
    'elementType': 'labels',
    'stylers': [{
      'visibility': 'on',
    },
    {
      'lightness': 20,
    },
    ],
  },
  {
    'featureType': 'road',
    'elementType': 'all',
    'stylers': [{
      'lightness': 20,
    }],
  },
  {
    'featureType': 'road.highway',
    'elementType': 'geometry',
    'stylers': [{
      'color': '#c5c6c6',
    }],
  },
  {
    'featureType': 'road.arterial',
    'elementType': 'geometry',
    'stylers': [{
      'color': '#e4d7c6',
    }],
  },
  {
    'featureType': 'road.local',
    'elementType': 'geometry',
    'stylers': [{
      'color': '#fbfaf7',
    }],
  },
  {
    'featureType': 'water',
    'elementType': 'all',
    'stylers': [{
      'visibility': 'on',
    },
    {
      'color': '#acbcc9',
    },
    ],
  },
  ];


function map(){
    const map= new google.maps.Map(document.getElementById('map'),{
        zoom: 7,
        center: {lat: 52.632469, lng: -1.689423},
        styles: mapStyle,
    });

    map.data.loadGeoJson('stores.json', {idPropertyName: 'storeNumber'});

    map.data.setStyle((feature)=> {
        const img= 'https://pnggrid.com/wp-content/uploads/2022/01/McDonalds-Logo-Circle.png';
        return {
            icon: {
                url: img,
                scaledSize: new google.maps.Size(35, 35),
            },
        };
    });

    const apiKey= 'apiKey';
    const infoWindow= new google.maps.InfoWindow();

    map.data.addListener('click', (event)=> {
        const storeNumber= event.feature.getProperty('storeNumber');
        const address= event.feature.getProperty('address');
        const city= event.feature.getProperty('city');
        const state= event.feature.getProperty('state');
        const zip= event.feature.getProperty('zip');
        const phone= event.feature.getProperty('phone');
        const position= event.feature.getGeometry().get();
        const content= `
        <img style= "float:left; width:200px; margin-top:30px" src= "logo.png">
        <div style= "margin-left: 220px; margin-bottom:20px;">
            <p><b>Store number:</b> ${storeNumber}</p>
            <p><b>Address:</b> ${address} ${city}, ${state} ${zip}</p>
            <p><br/><b>Phone:</b> ${phone}</p>
            <p><img src= "https://maps.googleapis.com/maps/api/streetview?size=350x120&location=${position.lat()},${position.lng()}&key=${apiKey}&solution_channel=GMP_codelabs_simplestorelocator_v1_a"></p>
        </div>`;

        infoWindow.setContent(content);
        infoWindow.setPosition(position);
        infoWindow.setOptions({pixelOffset: new google.maps.Size(0, -30)});
        infoWindow.open(map);
    });
    const card= document.createElement('div');
    const titleBar= document.createElement('div');
    const title= document.createElement('div');
    const container= document.createElement('div');
    const input= document.createElement('input');
    const options= {
        types: ['address'],
        componentRestrictions: {country: 'US'},
    };

    card.setAttribute('id', 'pac-card');
    title.setAttribute('id', 'title');
    title.textContent= 'Find nearest McDonalds';
    titleBar.appendChild(title);
    container.setAttribute('id', 'pac-container');
    input.setAttribute('id', 'pac-input');
    input.setAttribute('type', 'text');
    input.setAttribute('placeholder', 'Enter an address');
    container.appendChild(input);
    card.appendChild(titleBar);
    card.appendChild(container);
    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(card);

    const autocomplete= new google.maps.places.Autocomplete(input, options);
    autocomplete.setFields(
        ['address_components', 'geometry', 'name']);

    const originMarker= new google.maps.Marker({map:map});
    originMarker.setVisible(false);
    let originLocation= map.getCenter();

    autocomplete.addListener('place_changed', async ()=> {
        originMarker.setVisible(false);
        originLocation= map.getCenter();
        const place= autocomplete.getPlace();

        if (!place.geometry){
            window.alert('No address available for input: \'' + place.name + '\'');
            return;
        }

        originLocation= place.geometry.location;
        map.setCenter(originLocation);
        map.setZoom(9);

        originMarker.setPosition(originLocation);
        originMarker.setVisible(true);

        const rankedStores= await calculateDistances(map.data, originLocation);
        showStoresList(map.data, rankedStores);
        return;
    });
}

async function calculateDistances(data, origin){
    const stores= [];
    const destinations= [];

    data.forEach((store)=> {
        const storeNum= store.getProperty('storeNumber');
        const storeLoc= store.getGeometry().get();

        stores.push(storeNum);
        destinations.push(storeLoc);
    });

    const service= new google.maps.DistanceMatrixService();
    const getDistanceMatrix=
        (service, parameters)=> new Promise((resolve, reject)=> {
            service.getDistanceMatrix(parameters, (response, status)=> {
                if (status != google.maps.DistanceMatrixStatus.OK) {
                    reject (response);
                }else {
                    const distances= [];
                    const results= response.rows[0].elements;
                    for (let j=0; j<results.length; j++) {
                        const element= results[j];
                        const distanceText= element.distance.text;
                        const distanceVal= element.distance.value;
                        const distanceObject= {
                            storeNum: stores[j],
                            distanceText: distanceText,
                            distanceVal: distanceVal,
                        };
                        distances.push(distanceObject);
                    }
                    resolve(distances);
                }
            });
        });

        const distancesList= await getDistanceMatrix(service, {
            origins: [origin],
            destinations: destinations,
            travelMode: 'DRIVING',
            unitSystem: google.maps.UnitSystem.METRIC,
        });

        distancesList.sort((first, second)=> {
            return first.distanceVal - second.distanceVal;
        });
        return distancesList;
}

function showStoresList(data, stores){
    if (stores.length == 0) {
        console.log('empty stores');
        return;
    }

    let panel= document.createElement('div');
    if (document.getElementById('panel')) {
        panel= document.getElementById('panel');
        if (panel.classList.contains('open')) {
            panel.classList.remove('open');
        }
    }else {
        panel.setAttribute('id', 'panel');
        const body= document.body;
        body.insertBefore(panel, body.childNodes[0]);
    }

    while (panel.lastChild) {
        panel.removeChild(panel.lastChild);
    }

    stores.forEach((store)=> {
        const name= document.createElement('p');
        name.classList.add('place');
        const currentStore= data.getFeatureById(store.storeNum);
        name.textContent= currentStore.getProperty('name');
        panel.appendChild(name);
        const distanceText= document.createElement('p');
        distanceText.classList.add('distanceText');
        distanceText.textContent= store.distanceText;
        panel.appendChild(distanceText);
    });
    panel.classList.add('open');
    return;
}
