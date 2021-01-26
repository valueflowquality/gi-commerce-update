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

    if google?
      if not enhancedEcommerce
        requireGaPlugin 'ec'

      message = ""

      if item?
        message = item._name + " was added to the cart"
        prod =
          id: item._data.id,
          name: item._name,
          quantity: item._quantity

        gtag('event', 'add_to_cart', {
          "items": [ prod ]
        });

        if heap && typeof heap.track == "function"
          heap.track('add_to_cart', {
            id: item._data._id,
            name: item._name,
            quantity: item._quantity
          })

  sendTransaction: (obj , items) ->
    id = ''
    possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    i = 0
    while i < 25
      id += possible.charAt(Math.floor(Math.random() * possible.length))
      i++

    rev = 0
    products = []
    productIds = ""

    if items?
      for i in items
        rev += parseFloat(i._priceList?.prices?.US)
        prod =
          id: i._data.id,
          name: i._name,
          price: '' + i._priceList?.prices?.US || ''
          quantity: i._quantity
        products.push prod

        productIds += i._data._id + ';'

    gtag('event', 'purchase', {
      transaction_id: id,
      affiliation: "VFQ store",
      value: rev,
      currency: "USD",
      items: products
    })

    if heap && typeof heap.track == "function"
      purchase = {
        affiliation: "VFQ store",
        value: rev,
        currency: "USD"
      }

      if productIds
        purchase.items = productIds

      heap.track('purchase', purchase)
]
