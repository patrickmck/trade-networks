# [trade-networks.xyz](https://trade-networks.xyz)
Initially started as an experiment to explore changing lithium trade patterns, now expanding it to be a general-purpose data visualisation.

For a given trade product, constructs a network graph showing the top trade flows for each year 2015-2019. Nodes are arranged roughly according to geographic position, their size indicating total imports plus exports for that product. Thicker lines between nodes indicates more bilateral trade. Only the top nodes for a given year are shown, so that the changing trade structure can be observed over time.

## Web component
Written in plain HTML and JS, with D3.js providing the actual network graph visualisation. There are two major parts to the web component:
- _Product dropdown:_  This is made pretty and searchable thanks to Select2, a jQuery plugin. It uses a [local JSON](https://github.com/patrickmck/trade-networks/blob/master/www/public/product_options.json), rather than an AJAX request, to determine the actual menu items - better that the data come down the line once, rather than every time the user opens the dropdown.
- _Network graph:_ Renders nodes and edges to SVG, given a list of node and edge data. Uses the lat/lon of each country's centroid, together with d3-projections, to ensure node positions roughly correspond to geographic location. Not all links are shown - currently just the top 50% by volume.

Bundled using Webpack, as much for the learning experience as out of necessity.

## API component
Trade products are classified according to the [Harmonized System (HS) codes](https://unstats.un.org/unsd/tradekb/Knowledgebase/50018/Harmonized-Commodity-Description-and-Coding-Systems-HS), a very detailed classification maintained by the UN. The original data (see below) was a set of ~800MB CSV files, one for each year covering all products. For fast access to the data for API use, it was first necessary to [process the data](https://github.com/patrickmck/trade-networks/blob/master/api/split_products.py) so that instead there would be a large set of small files, each covering just one product across all years.

Once a HS product is selected by the user, this triggers an API request with the product code as a query parameter. The API passes the request through to a [Lambda function](https://github.com/patrickmck/trade-networks/blob/master/api/lambda/trade-data-processing/lambda_function.py), which then looks up the relevant data and turns it into useable node/edge lists for the front-end.

## Data citation
Originally I was using UN ComTrade data, but then discovered the Harvard Dataverse "Atlas of Economic Complexity", which uses the same data but puts a bunch of effort into cleaning it:

> The [Atlas of Economic Complexity](http://atlas.cid.harvard.edu/) maintains trade data in multiple international classification systems. This data set contains trade flows classified via Harmonized System (HS) 1992. HS data offers a contemporary and detailed classification of goods, but covers a relatively short time period:
> - Categorizes approximately 5,000 goods
> - Covers years from 1995–2019
> - Categories break down to 1-, 2-, 4-, or 6-digit detail levels (though country reporting can be less reliable at the 6-digit level)
>
> Raw data on trade in goods is provided by [United Nations Statistical Division (COMTRADE)](https://comtrade.un.org/). The data is then cleaned by Growth Lab researchers using the [Bustos-Yildirim Method](http://atlas.cid.harvard.edu/data/data#data-cleaning) which uses bilateral trade flows to account for inconsistent reporting and provides more reliable accounting.
>
> In addition to trade in goods, the data additionally contains unilateral data on services trade provided by the [International Monetary Fund (IMF)](https://www.imf.org/en/Data) and acquired through the [World Development Indicators (WDI)](https://datacatalog.worldbank.org/dataset/world-development-indicators) of The World Bank.
>
> For further information, see the [data information page](http://atlas.cid.harvard.edu/data) on the Atlas website. 

_The Growth Lab at Harvard University_, 2019, "International Trade Data (HS, 92)", https://doi.org/10.7910/DVN/T4CHWJ, Harvard Dataverse, V4, UNF:6:fBTbvO79jN4d+3lfNSzRtw==
