var chart_tree = {
    margin: ({ top: 10, right: 120, bottom: 10, left: 40 }),
    dy: document.body.clientWidth / 200,
    height: 10,
    dx: 10,
    top: 0,
    diagonal: d3.linkHorizontal().x(d => d.y).y(d => d.x),
    zoom: 10,
    width: 90,
    radius: 10,
    data: null,
    refresh() {
        this.tree = d3.tree().nodeSize([this.dx, this.dy * this.radius])
        this.update(this.data);
    },
    changeZoom(zoom) {
        this.zoom = zoom
        svg = d3.select('#svg_canvas');
        svg.attr("viewBox", this.autoBox())
    },
    autoBox() {
        return [-this.margin.left, this.top - this.margin.top,
            this.width * this.zoom, this.height * this.zoom
        ]
    },
    draw(root) {
        this.tree = d3.tree().nodeSize([this.dx, this.dy * this.radius])

        root.x0 = this.dy / 2;
        root.y0 = 0;
        root.descendants().forEach((d, i) => {
            d.id = i;
            d._children = d.children;
            if (d.depth && d.data.name.length !== 7) d.children = null;
        });
        var svg = d3.select('#chart')
            .select("svg")
            .attr("viewBox", this.autoBox())
            .style("font", "10px sans-serif")
            .style("user-select", "none")
            .attr("id", "svg_canvas")
            .call(d3.zoom().on("zoom", function() {
                svg.select("g").attr("transform", d3.event.transform)
            }));
        var g = svg.select("g")
        g.selectAll("g").remove()
        const gLink = g.append("g")
            .attr("fill", "none")
            .attr("stroke", "#555")
            .attr("stroke-opacity", 0.4)
            .attr("stroke-width", 1.5);

        const gNode = g.append("g")
            .attr("cursor", "pointer")
            .attr("pointer-events", "all");

        this.update = function(source) {
            const duration = d3.event && d3.event.altKey ? 2500 : 250;
            const nodes = root.descendants().reverse();
            const links = root.links();

            // Compute the new tree layout.
            this.tree(root);

            let left = root;
            let right = root;
            root.eachBefore(node => {
                if (node.x < left.x) left = node;
                if (node.x > right.x) right = node;
            });

            this.height = right.x - left.x + this.margin.top + this.margin.bottom;
            this.top = left.x

            const transition = svg.transition()
                .duration(duration)
                .attr("viewBox", this.autoBox())
                .tween("resize", window.ResizeObserver ? null : () => () => svg.dispatch("toggle"));

            // Update the nodes…
            const node = gNode.selectAll("g")
                .data(nodes, d => d.id);

            // Enter any new nodes at the parent's previous position.
            const nodeEnter = node.enter().append("g")
                .attr("transform", d => `translate(${source.y0},${source.x0})`)
                .attr("fill-opacity", 0)
                .attr("stroke-opacity", 0)
                .on("click", d => {
                    d.children = d.children ? null : d._children;
                    this.update(d);
                });

            nodeEnter.append("circle")
                .attr("r", 2.5)
                .attr("fill", d => d._children ? "#555" : "#999")
                .attr("stroke-width", 10);

            nodeEnter.append("text")
                .attr("dy", "0.31em")
                .attr("x", d => d._children ? -6 : 6)
                .attr("text-anchor", d => d._children ? "end" : "start")
                .text(d => d.data.name)
                .clone(true).lower()
                .attr("stroke-linejoin", "round")
                .attr("stroke-width", 3)
                .attr("stroke", "white");

            // Transition nodes to their new position.
            const nodeUpdate = node.merge(nodeEnter).transition(transition)
                .attr("transform", d => `translate(${d.y},${d.x})`)
                .attr("fill-opacity", 1)
                .attr("stroke-opacity", 1);

            // Transition exiting nodes to the parent's new position.
            const nodeExit = node.exit().transition(transition).remove()
                .attr("transform", d => `translate(${source.y},${source.x})`)
                .attr("fill-opacity", 0)
                .attr("stroke-opacity", 0);

            // Update the links…
            const link = gLink.selectAll("path")
                .data(links, d => d.target.id);

            // Enter any new links at the parent's previous position.
            const linkEnter = link.enter().append("path")
                .attr("d", d => {
                    const o = { x: source.x0, y: source.y0 };
                    return this.diagonal({ source: o, target: o });
                });

            // Transition links to their new position.
            link.merge(linkEnter).transition(transition)
                .attr("d", this.diagonal);

            // Transition exiting nodes to the parent's new position.
            link.exit().transition(transition).remove()
                .attr("d", d => {
                    const o = { x: source.x, y: source.y };
                    return this.diagonal({ source: o, target: o });
                });

            // Stash the old positions for transition.
            root.eachBefore(d => {
                d.x0 = d.x;
                d.y0 = d.y;
            });
        }
        this.update(root);
        this.data = root; //save data for later use and refresh
    }
}