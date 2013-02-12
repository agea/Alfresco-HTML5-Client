$("#rootLevel").autocomplete(
		{
			source : function(request, response) {
				var term = request.term;

				$.getJSON(x.BASE + "marketing/offer/searchRootLevel?q=" + term,
						request, function(data, status, xhr) {

							response(_.map(data, function(sh) {
								return {
									label : sh.text,
									value : sh.id
								};
							}));
						});
			},
			minLength : 2,
			select : function(event, ui) {
				xman.get('marketing/offer/rootLevel?id=' + ui.item.value,
						function(data) {
							xman.vm.entity().rootLevel(x.map(data));
						});
			}
		});
console.log("someone called me!");