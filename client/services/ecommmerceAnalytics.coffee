angular.module('gi.commerce').factory 'giEcommerceAnalytics'
, ['giLog', 'giAnalytics'
, (Log, Analytics) ->

  enhancedEcommerce = false
  if ga?
    google = ga

  requireGaPlugin = (x) ->
    Log.debug('ga requiring ' + x)
    if google?
      google 'require', x

  viewProductList: (name, items) ->
    Log.log 'Product list: ' + name + ' with: ' + items.length + ' items viewed'
    angular.forEach items, (item, idx) ->
      Log.log item
      impression =
        id: item.name
        name: item.displayName
        list: name
        position: idx + 1

      Analytics.Impression impression
    Analytics.PageView()


  sendCartView: (obj, items) ->
    inCartProducts = []

    if google?
      if not enhancedEcommerce
        requireGaPlugin 'ec'

      if items?
        for i in items
          prod =
            id: i._data.id,
            name: i._name,
            quantity: i._quantity

          ga('ec:addProduct', prod)

      ga('ec:setAction', 'checkout', obj)
      ga('send', 'pageview')

  checkOut: (items) ->
    inCartProducts = []

    products = []

    if items? && items.length > 0
      for i in items
        prod =
          id: i._data.id,
          name: i._name,
          quantity: i._quantity

        products.push prod

      gtag('event', 'begin_checkout', {
        items: products
      });

  addToCart: (item) ->
    inCartProducts = []

    if item?
      if heap && typeof heap.track == "function"
        heap.track('add_to_cart', {
          id: item._data._id,
          name: item._name,
          quantity: item._quantity
        })

      if google?
        if not enhancedEcommerce
          requireGaPlugin 'ec'

        prod =
          id: item._data.id,
          name: item._name,
          quantity: item._quantity

        gtag('event', 'add_to_cart', {
          "items": [ prod ]
        });

  sendTransaction: (obj , items, marketCode, currency) ->
    id = ''
    possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    i = 0
    while i < 25
      id += possible.charAt(Math.floor(Math.random() * possible.length))
      i++

    rev = 0
    products = []
    productIds = ""

    if !marketCode
      marketCode = "US"

    if items?
      for i in items
        itemPrice = 0
        if marketCode
          itemPrice = i._priceList?.prices?[marketCode]

        prod =
          id: i._data.id,
          name: i._name,
          quantity: i._quantity,
          currency: currency

        if itemPrice
          prod.price = '' + itemPrice
          rev += parseFloat(itemPrice)
        else
          prod.price = ''

        products.push prod

        productIds += i._data._id + ';'

    if heap && typeof heap.track == "function"
      purchase = {
        affiliation: "VFQ store",
        value: rev,
        currency: currency
      }

      if productIds
        purchase.items = productIds

      heap.track('purchase', purchase)

    gtag('event', 'purchase', {
      transaction_id: id,
      affiliation: "VFQ store",
      value: rev,
      currency: currency,
      items: products
    })
]
