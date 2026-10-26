import pkg from './package.json' with {type:'json'}

export default  {
	
	name: pkg.name,
	triggers: {
		keywords: ['tourist attractions', 'things to do', 'places to visit', 'landmarks', 'sights', 'points of interest', 'museums']
		
	},
	query_format: {
		regex: [
			
			'((best|top|famous)\\s+)?(tourist\\s+(attractions?|spots?)|attractions?|things\\s+to\\s+(do|see)|what\\s+to\\s+(do|see)|sightseeing|places\\s+to\\s+(visit|see)|landmarks|sights|points\\s+of\\s+interest)\\s+(in|near|around)\\s+HD_LOCATION(__\\w+)?.*',
			// official pattern, extended with: heritage sites, mosques, churches, castles, palaces, gardens, shrines, galleries
			'((best|top|famous)\\s+)?(museums?|monuments?|temples?|forts?|viewpoints?|parks?|historic(al)?\\s+sites?|heritage\\s+sites?|mosques?|churches|castles?|palaces?|gardens?|shrines?|galler(y|ies))\\s+(in|near|around)\\s+HD_LOCATION(__\\w+)?.*'
		]
		// in the future, we can add other types of query formats
	},
	server: {
		location: 'dist/backend/index.js',
		configPath: 'dist/backend/wrangler.jsonc',
		schemaPath: 'dist/backend/schema.jsonc'
	},
	client: {
		// location of client side code
		// should point to pkg.umd - but currently that points to dist/index.umd.js
		location: pkg.module,
		// name of the UMD module
		moduleName: pkg.umdName || 'HD' + pkg.name,
		// baseURL is only used in local testing and ignored after publish
		// Optional: defaults to '/name' (the name of the component)
		baseURL: '/' + pkg.name,

	},
	format: {
		mainline: true,
		sidebar: true
		// "sidebar" / "mainline" / "ribbon" / "fullscreen"
	},
	permissions: {
		
	},
	info: {
		// key-values added here will be added to the compInfo section of searchData
	},
	github: "https://github.com/lenin-12/Tourism-Explorer-HyperDart.git",
	demovideo: "https://youtu.be/DVkbRJk5_lA"
}
