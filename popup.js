let loadingData = false;

// show loading spinner
function showLoading() {
    const loadingSpinner = document.getElementById("loading-spinner");
    loadingData = true;
    loadingSpinner.style.display = "block";
  }
  
  // hide loading spinner
  function hideLoading() {
    const loadingSpinner = document.getElementById("loading-spinner");
    loadingData = false;
    loadingSpinner.style.display = "none";
  }

function clearData () {
    const resultsContainer = document.getElementById("results");
    resultsContainer.innerHTML = "";
    const contentJson = document.getElementById("content-json-text");
    contentJson.value = "";
    const contentTitle = document.getElementById("content-json-title");
    contentTitle.innerHTML = "JSON";
    const btnContainer = document.getElementById("btn-container");
    btnContainer.innerHTML = "";
}

clearData();

document.getElementById("send-api").addEventListener("click", () => {
    // clear previous results
    const resultsContainer = document.getElementById("results");
    resultsContainer.innerHTML = "";
    const apiInput = document.getElementById("api-input").value;
    const data = []
    if (!apiInput) {
      alert("Please enter a valid API URL.");
      return;
    }

    if (loadingData) {
        alert("Please wait for the current request to finish.");
        return;
    }

    showLoading();
    
    // Send the API URL to the background script
    chrome.runtime.sendMessage({ action: "fetchAPI", apiUrl: apiInput }, (response) => {
        if(response.error) {
            alert(response.error);
            hideLoading();
            return;
        }

      if (response && response.requestDetails) {
        // Extract request details from background response
        const { method, headers } = response.requestDetails;
  
        // Fetch data from two hosts
        const hosts = ["http://10.10.14.4:11061", "http://10.10.14.4:11062"];
        clearData()

        const url = apiInput.split(hosts[0])[1];
  
        const fetchPromises = hosts.map((host) => {
          const fullUrl = `${host}${url}`;
          return fetch(fullUrl, {
            method,
            headers: headers.reduce((acc, header) => {
              acc[header.name] = header.value;
              return acc;
            }, {}),
          })
            .then((res) => res.json())
            .catch((err) => ({ error: err }));
        });

        Promise.all(fetchPromises)
          .then((responses) => {
            responses.forEach((response, index) => {
              data[index] = response.data
            });
            hideLoading();
            
            // Compare the APIs
            const result = compareAPIs(data[0], data[1]);

            // Display the comparison results
                displayResults(result, data);
            })
          .catch((err) => {
            console.error('Error fetching data from hosts:', err);
            hideLoading();
          });
      }
    });
  });
  

  function compareAPIs(api1, api2) {
    function getFieldsWithTypes(obj, prefix = "") {
      let fields = {};
      for (const key in obj) {
        const prefixedKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
          Object.assign(fields, getFieldsWithTypes(obj[key], prefixedKey));
        } else {
          fields[prefixedKey] = typeof obj[key];
        }
      }
      return fields;
    }
  
    const api1Fields = getFieldsWithTypes(api1);
    const api2Fields = getFieldsWithTypes(api2);
  
    const missingInApi2 = Object.keys(api1Fields).filter((field) => !api2Fields.hasOwnProperty(field));
    const extraInApi2 = Object.keys(api2Fields).filter((field) => !api1Fields.hasOwnProperty(field));
  
    const typeMismatches = [];
    for (const field of Object.keys(api1Fields)) {
      if (api2Fields.hasOwnProperty(field) && api1Fields[field] !== api2Fields[field]) {
        typeMismatches.push({
          field,
          api1Type: api1Fields[field],
          api2Type: api2Fields[field],
        });
      }
    }
  
    return {
      missingInApi2,
      extraInApi2,
      typeMismatches,
    };
  }

  function displayResults(comparisonData, dataJson) {
    // Show the APIs
    const resultsContainer = document.getElementById("results");
    const btnContainer = document.getElementById("btn-container");
    const contentTitle = document.getElementById("content-json-title");
    const contentJson = document.getElementById("content-json-text");
    resultsContainer.innerHTML = ""; // Clear previous results
  
    // Render Missing Fields in API 2
    if (comparisonData.missingInApi2.length > 0) {
      const missingDiv = document.createElement("div");
      missingDiv.innerHTML = `<h3>Missing in API 2</h3>`;
      comparisonData.missingInApi2.forEach((field) => {
        const fieldDiv = document.createElement("div");
        fieldDiv.className = "field missing";
        fieldDiv.textContent = field;
        missingDiv.appendChild(fieldDiv);
      });
      resultsContainer.appendChild(missingDiv);
    }
  
    // Render Extra Fields in API 2
    if (comparisonData.extraInApi2.length > 0) {
      const extraDiv = document.createElement("div");
      extraDiv.innerHTML = `<h3>Extra in API 2</h3>`;
      comparisonData.extraInApi2.forEach((field) => {
        const fieldDiv = document.createElement("div");
        fieldDiv.className = "field extra";
        fieldDiv.textContent = field;
        extraDiv.appendChild(fieldDiv);
      });
      resultsContainer.appendChild(extraDiv);
    }
  
    // Render Type Mismatches
    if (comparisonData.typeMismatches.length > 0) {
      const mismatchDiv = document.createElement("div");
      mismatchDiv.innerHTML = `<h3>Type Mismatches</h3>`;
      comparisonData.typeMismatches.forEach((mismatch) => {
        const fieldDiv = document.createElement("div");
        fieldDiv.className = "field mismatch";
        fieldDiv.textContent = `${mismatch.field}: API 1 (${mismatch.api1Type}) vs API 2 (${mismatch.api2Type})`;
        mismatchDiv.appendChild(fieldDiv);
      });
      resultsContainer.appendChild(mismatchDiv);
    }

    // add 2 button show json 1, json 2 in popup ui
    const showJson1 = document.createElement("button", { id: "show-json-1" });
    showJson1.innerHTML = "Show Json 1";
    showJson1.onclick = function() {
        contentJson.value = JSON.stringify(dataJson[0], null, 2);
        contentTitle.innerHTML = "Json 1";
    }

    const showJson2 = document.createElement("button", { id: "show-json-2" });
    showJson2.innerHTML = "Show Json 2";
    showJson2.onclick = function() {
        contentJson.value = JSON.stringify(dataJson[1], null, 2);
        contentTitle.innerHTML = "Json 2";
    }

    btnContainer.appendChild(showJson1);
    btnContainer.appendChild(showJson2);


    // if no differences found
    if (comparisonData.missingInApi2.length === 0 && comparisonData.extraInApi2.length === 0 && comparisonData.typeMismatches.length === 0) {
        const noDifferencesDiv = document.createElement("div");
        noDifferencesDiv.innerHTML = `<h3>No differences found</h3>`;
        resultsContainer.appendChild(noDifferencesDiv);
        btnContainer.innerHTML = "";
        contentJson.value = "";
      }
  }