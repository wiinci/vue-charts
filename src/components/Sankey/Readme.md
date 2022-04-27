# Sankey diagram

This example explores the possibility of using a Sankey diagram for a data lineage or a dependency tracing type of scenarios. A high `nodePadding` value ensures that the link thickness doesn't exceed 1px. The nodes are practically absent but the `Nodes` component is included in case its needed.

## Usage

```vue
<Sankey :data="data" />
```

## Props

|Name|Description|Type|Required|Default value|Allowed value(s)|
|--|--|--|--|--|--|
|`data`|JSON array of objects containing the `source`, `target` and one of `id` or `name` properties|Object[]|✅|||
|`height`|Chart height, px|Number||480||
|`marginBottom`|Bottom chart offset, px|Number||20||
|`marginLeft`|Left chart offset, px|Number||20||
|`marginRight`|Right chart offset, px|Number||20||
|`marginTop`|Top chart offset, px|Number||20||
|`nodeAlign`|Left-align or justify-align the Sankey nodes|String||`left`|`justify`|
|`nodeId`|Unique identifier for Sankey nodes. Defined in the JSON data|String||`id`||
|`nodePadding`|Vertical distance between Sankey nodes|Number||10||
|`nodeWidth`|Rectangular node width|Number||10||
|`sort`|Sort node order in the vertical direction|Boolean||`false`||
|`width`|Chart width, px|Number||960||

## Demo

### Animate on initial render

![animate](https://user-images.githubusercontent.com/505739/164956042-df35b3f8-6a04-4f0d-9de4-d8f20395ee8a.gif)

### Highlight behavior

![highlight](https://user-images.githubusercontent.com/505739/164955957-9fc4e62e-6918-415a-97d3-dbe6e42f422d.gif)

## Todo

- [ ] Honor reduced motion settings
- [ ] Collapsible nodes

