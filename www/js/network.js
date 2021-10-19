/**
 * Dropdown handler
 */

const product_options = require('../public/product_options.json')
import loading_gif from '../img/loading.gif'

// let product_selector = document.getElementById('product-input')
// Object.keys(products).map((val,ind) => {product_selector.options[ind+1] = new Option(products[val], val)})

const api_url = "https://frklvrq4cj.execute-api.ap-southeast-2.amazonaws.com/testing"

import $ from 'jquery';
import 'select2';
import 'select2/dist/css/select2.css'

d3.select('#network-graph').append('div').attr('class', 'alerts')
    .append('img').attr('class', 'loading')
    .attr('src', loading_gif)
    .style('display', 'none')

$(() => {
    $('.dropdown').select2({
        // ajax: {
        //     url: `${api_url}/menu`,
        //     dataType: 'json',
        //     processResults: (data) => JSON.parse(data)
        // },
        data: product_options.results,
        placeholder: 'Choose a trade product ...',
        debug: true,
        cache: true,
    })
    
    $("#product-input").on("select2:select", event => {
        // Set product code to prepare request
        let product_code = event.params.data.id

        // Fetch new data from the API
        load_graph_data(product_code)
    })

    $(".input-example").on("click", event => {
        let example_id = event.target.id.split("eg-")[1]
        update_select_example(example_id)
    })
})

function update_select_example(name) {
    $("#product-input").val(name)
    $("#product-input").trigger('change')
    load_graph_data(name)
}

/**
 * Network graph drawer
 */

import * as d3 from 'd3'

const fig_width = Math.max(800, 0.9*d3.select("#network-graph").property('scrollWidth'))
const fig_height = 400
const legend_height = 100
const legend_buffer_height = 20
let transition_duration = 500

let trade_year = d3.select('#li-trade-year-input').node().value;
var data = {nodes: null, links: null};
let product_code = '333444'
let nodescale;
let linkscale;

function load_graph_data(product_code) {

    console.log(`Requesting product code ${product_code}`)

    // Set loading gif
    d3.selectAll('text.errormsg').remove()
    d3.selectAll('img.loading').style('transform', `translate(${fig_width/2}px,0px)`).style('display', 'block')

    // Remove previous graph artefacts, if any exist
    d3.selectAll("circle.netnode").remove()
    d3.selectAll("text.nodetxt").remove()
    d3.selectAll("line.netlink").remove()

    // Retrieve data
    fetch(`${api_url}/product?hs_code=${product_code}`, {method: "GET", cache: 'force-cache'})
        .then(response => response.json())
        .then(d => {
            console.log(`API returned status ${d.statusCode}`)
            // Assign the returned data
            data = JSON.parse(d.body)
            // Initialise the scales once only (year-independent)
            nodescale = bubblescaler(data)
            linkscale = edgelinescaler(data)
            // Hide the loading spinner, display the legend
            d3.selectAll('img.loading').style('display', 'none')
            d3.select('#legend-text').style('display', 'block')
            // Initialise the network with the new data
            update_li_network()
            return 200
        })
        .catch(error => {
            d3.selectAll('img.loading').style('display', 'none')
            d3.selectAll('div.alerts')
                .append('text').attr('class', 'errormsg')
                .text("Sorry, could not find that product!")
                .style('transform', `translate(${fig_width/2}px, ${fig_height/2}px)`)
            console.log('error:')
            console.log(error)
            console.log('data:')
            console.log(data)
            return 404
        })
}


// Expecting trade volumes to take arbitrary non-negative values, construct scales
// for both bubbles (entity total volume) and links (pairwise volume)
let bubble_min_size = 5
let bubble_max_size = 50
let bubblescaler = data => d3.scaleLinear()
    .domain([
        // To highlight changes in volume over the years, need the scale to be from
        // the minimum to the maximum volume attained by any country _for all years_
        Math.min(...data.nodes.map(n => Math.min(...Object.values(n.volume)))),
        Math.max(...data.nodes.map(n => Math.max(...Object.values(n.volume))))
    ])
    .range([bubble_min_size, bubble_max_size]);

let edgeline_min_size = 0.2
let edgeline_max_size = 10
let edgelinescaler = data => d3.scaleLinear()
    .domain([
        Math.min(...data.links.map(l => Math.min(...Object.values(l.volume)))),
        Math.max(...data.links.map(l => Math.max(...Object.values(l.volume))))
    ])
    .range([edgeline_min_size, edgeline_max_size]);

// Nodes are assigned a "type" between 0 (importer) and 1 (exporter) so the colour
// scale should be divergent with the midway colour corresponding to a type of 0.5
let colourScale = d3.scaleOrdinal(d3.schemeTableau10)

// Geographical projection to translate (lon,lat) into (x,y) coordinates
let geoScale = d3.geoMercator()
    .center([35,0])
    .translate([fig_width/2, fig_height/2])

// Set up base selection and append a blank svg
let fig = d3.select("#network-graph")
    .append('svg')
    .attr('width', fig_width)
    .attr('height', fig_height)

d3.select("#network-graph").append('br')

// Set up tooltip div to be populated on mouseover
let tooltip = d3.select("#network-graph")
    .append('div')
    .attr('class', 'tooltip')
    .style('opacity', 0)
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "2px")
    .style("border-radius", "5px")
    .style("padding", "5px")
    .style("display", "inline-block")
    .style("text-align", "left")

// Three function that change the tooltip when user hover / move / leave a cell
let mouseover = function(d) {
    tooltip
      .style("opacity", 1)
      .style('transform', `translate(0px, 0px)`)
    d3.select(this)
      .style("stroke", "black")
    d3.selectAll('line.netlink')
      .filter(d => d.id.includes(this.getAttribute('name')))
      .style('stroke', d => d.source.name==this.getAttribute('name') ? 'red' : 'blue')
}
let mousemove = function(d) {
    tooltip
        .html(make_node_tooltip_content(this))
        .style('transform', `translate(${d3.pointer(d)[0]+10-fig_width/2}px, ${d3.pointer(d)[1]+15-fig_height}px)`)
}
let mouseleave = function(d) {
    tooltip
        .style("opacity", 0)
        .style('transform', `translate(0px, 0px)`)
    d3.select(this)
        .style("stroke", "none")
    d3.selectAll('line.netlink')
        .filter(d => d.id.includes(this.getAttribute('name')))
        .style('stroke', 'black')
}

// Function to generate tooltip html content, given a node selection
let make_node_tooltip_content = node => {
    let this_node = data.nodes.find(d => d.name==node.getAttribute('name'))
    let export_volume = Math.round(this_node.volume[trade_year] * this_node.type[trade_year])
    let import_volume = Math.round(this_node.volume[trade_year] * (1-this_node.type[trade_year]))
    let output_html = `<b>${this_node.name_full}</b><br/>\
    Imports: $${import_volume.toLocaleString('en-US')}<br/>\
    Exports: $${export_volume.toLocaleString('en-US')}
    `
    return output_html
}

let force_simulation = d3.forceSimulation()
    .force("charge", d3.forceManyBody().strength(-100))
    // .force("center", d3.forceCenter().x(300).y(300))
    .force("collision", d3.forceCollide().radius(d => 1.4*(d.r)))
    .force("x", d3.forceX().x(d => d.xpos))
    .force("y", d3.forceY().y(d => d.ypos))
    // .size([fig_width, fig_height])
    .on('tick', updateNetworkSim)

function updateNetworkSim() {
    d3.selectAll("circle.netnode")
        .attr("cx", d => Math.min(Math.max(d.x, d.r), fig_width - d.r))
        .attr("cy", d => Math.min(Math.max(d.y, d.r), fig_height - d.r))
    // d3.selectAll("rect.nodebg")
    //     .attr("x", d => Math.min(Math.max(d.x, d.r), fig_width - d.r))
    //     .attr("y", d => Math.min(Math.max(d.y, d.r), fig_height - d.r)+10)
    d3.selectAll("text.nodetxt")
        .attr("x", d => Math.min(Math.max(d.x, d.r), fig_width - d.r))
        .attr("y", d => Math.min(Math.max(d.y, d.r), fig_height - d.r)+20)
    d3.selectAll("line.netlink")
        .attr("x1", d => Math.min(Math.max(d.source.x, d.source.r), fig_width - d.source.r))
        .attr("x2", d => Math.min(Math.max(d.target.x, d.target.r), fig_width - d.target.r))
        .attr("y1", d => Math.min(Math.max(d.source.y, d.source.r), fig_height - d.source.r))
        .attr("y2", d => Math.min(Math.max(d.target.y, d.target.r), fig_height - d.target.r))
}

let node_data;
let edge_data;
let findNode;

let update_trade_year_display = () => {
    d3.selectAll('.li-trade-year-display')
        .remove()
    d3.select('#li-trade-year-input-display')
        .append('text')
        .attr('class', 'li-trade-year-display')
        .attr("text-anchor", "middle")
        .text(trade_year)
}
update_trade_year_display()

d3.select("#li-trade-year-input").on('input', () => {
    update_li_network()
    update_trade_year_display()
})

function update_li_network() {
    // console.log(data)
    trade_year = d3.select('#li-trade-year-input').node().value

    /**
    For lines to appear below circles, they have to be drawn first. To avoid
    drawing newly-appearing lines on top of already-existing circles, they'll
    all get drawn at once.
    
    If any line/circle should _not_ be visible to the user, its thickness/radius
    will simply be set to zero, rendering useless the enter() and exit() methods
    in the d3 general update pattern.

     */

    node_data = data.nodes.reduce((accum, node) => {
        // Translate the geographic coordinates to svg coordinates
        let coords = geoScale([node.lon, node.lat])
        let xpos = coords[0]
        let ypos = coords[1]
        // Check whether a circle already exists on the DOM for this node
        // (see findNode below) and if so, pull across current (x,y) values
        let prevNode = findNode ? findNode[node.id] : undefined
        if(prevNode) {
            accum.push({
                // id: node.id,
                r: node.volume[trade_year] ? nodescale(node.volume[trade_year]) : 0,
                name: node.name,
                x: prevNode.x,
                y: prevNode.y,
                xpos: xpos,
                ypos: ypos,
                type: node.type[trade_year]
            })
        }
        else {
            // This node is newly introduced, so just use the
            // canonical (x.y) positions as the start values
            accum.push({
                // id: node.id,
                r: node.volume[trade_year] ? nodescale(node.volume[trade_year]) : 0,
                name: node.name,
                x: xpos,
                y: ypos,
                xpos: xpos,
                ypos: ypos,
                type: node.type[trade_year]
            })
        }
        return accum
    }, [])
    // console.log(node_data)

    // When updating the start and end points for drawing edge lines, we
    // will need access to the actual objects at the start and end nodes,
    // to fetch their current positions in the DOM.
    findNode = node_data.reduce((findarray, node) => {
        findarray[node.name] = node;
        return findarray
    }, {})
    

    // Construct edge data similar to nodes, but edges show up when their
    // source and target nodes both have non-zero radius and their volume
    // is above a given level
    let show_edge_cutoff_level = 0.5
    let show_edge_cutoff = data.links.map(link => link.volume[trade_year]).sort((a,b) => a-b)[Math.floor(data.links.length*show_edge_cutoff_level)]
    
    edge_data = data.links.reduce((accum, link) => {
        let source_node = findNode[link.source]
        let target_node = findNode[link.target]
        
        if ((source_node != undefined) & (target_node != undefined)) {
            let show_edge = (source_node.r * target_node.r > 0) & (link.volume[trade_year] >= show_edge_cutoff)
            accum.push({
                id: `${link.source}-${link.target}`,
                source: source_node,
                target: target_node,
                strength: show_edge ? linkscale(link.volume[trade_year]) : 0
            })
        }
        return accum
    }, [])

    // Perform edge select-join-update before nodes and labels, so that
    // graph lines appear underneath the bubbles and are hidden by them
    
    let edgeSelect = fig.selectAll("line.netlink")
        .data(edge_data, d => d.id)
        .join(
            (enter) => {
                return enter
                    .append('line')
                    .attr('class', 'netlink')
                    .style('stroke', 'black')
                    .style('stroke-width', `0px`)
                    .attr("x1", e => e.source.x)
                    .attr("x2", e => e.target.x)
                    .attr("y1", e => e.source.y)
                    .attr("y2", e => e.target.y)
            },
            (update) => {
                return update
            },
            (exit) => {
                return exit
                    .transition()
                    .duration(transition_duration)
                    .style('stroke-width', `0px`)
                    .remove()
            }
        )
        .transition()
        .duration(transition_duration)
        .style('stroke-width', d => `${d.strength}px`)


    let nodeSelect = fig.selectAll("circle.netnode")
        .data(node_data, d => d.name)
        .join(
            (enter) => {
                return enter
                    .append('circle')
                    .attr('class', 'netnode')
                    .attr('name', d => d.name)
                    .attr('fill', d => d3.interpolateRdYlBu(d.type))
                    .on("mouseover", mouseover)
                    .on("mousemove", mousemove)
                    .on("mouseleave", mouseleave)
            },
            (update) => {
                return update
            },
            (exit) => {
                return exit
                    .transition()
                    .duration(transition_duration)
                    .attr('r', 0)
                    .remove()
            }
        )
        .transition()
        .duration(transition_duration)
        .attr('r', d => d.r)

    // fig.selectAll("text.nodetxt")
    //     .data(node_data, d => `${d.name}-txt`)
    //     .join('text')
    //         .attr('class', 'nodetxt')
    //         .call(s => s.each((d,i) => d.bbox = fig.selectAll("text.nodetxt").nodes()[i].getBBox()))
    
    // fig.selectAll("text.nodetxt").remove()

    let textSelect = fig.selectAll("text.nodetxt")
        .data(node_data, d => `${d.name}-txt`)
        .join(
            (enter) => {
                return enter
                    .append('text')
                    .attr('class', 'nodetxt')
                    .style('fill', d => d3.interpolateRdYlBu(d.type))
            },
            (update) => {
                return update
            },
            (exit) => {
                return exit
                    .transition()
                    .duration(transition_duration)
                    .remove()
            }
        )
        .transition()
        .duration(transition_duration)
        .text(d => d.name)
        .style('font-size', '0.8em')
        .style('display', d => d.r ? 'block' : 'none')
        

    // let textBgSelect = fig.selectAll("rect.nodebg")
    //     .data(node_data, d => `${d.name}-bg`)
    //     .join(
    //         (enter) => {
    //             return enter
    //                 .append('rect')
    //                 .attr('class', 'nodebg')
    //                 .style('fill', 'black')
    //         },
    //         (update) => {
    //             return update
    //         },
    //         (exit) => {
    //             return exit
    //                 .transition()
    //                 .duration(transition_duration)
    //                 .remove()
    //         }
    //     )
    //     .transition()
    //     .duration(transition_duration)
    //     .attr('width', d => {console.log(d); return d.bbox.width})
    //     .attr('height', d => d.bbox.height)

    // Reset the force simulation to take account of the new data
    force_simulation.force('x').initialize(node_data)
    force_simulation.force('y').initialize(node_data)
    force_simulation.force('collision').initialize(node_data)
    force_simulation.nodes(node_data)
    force_simulation.alpha(0.8).restart();
}
