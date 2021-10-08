# trade-networks.xyz
Initially started as an experiment to explore changing lithium carbonate/hydroxide trade patterns, now expanding it to be a general-purpose data visualisation. For a given product, it will construct a network graph showing the top trade flows for each year, allowing the user to cycle through years.

The network graph visualisation is written using D3.js and the web component in vanilla javascript. This calls a web API written in Python and hosted on AWS.

### data citation
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
