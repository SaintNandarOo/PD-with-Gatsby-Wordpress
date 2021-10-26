const postsTemplate = require.resolve('../src/templates/post/index.js');
 
const GET_POSTS = `
  query GET_POSTS($first:Int $after:String) {
    wpgraphql {
      posts(
        first: $first
        after: $after
        # This will make sure to only get the parent nodes and no children
        where: {
          parent: null
         }
      ) {
        postsInfo {
          hasNextposts
          endCursor
        }
        nodes {
          id
          title
          postsId
          content
          uri
          isFrontposts
        }
      }
    }
  }
`
 
const allposts = []
let postsNumber = 0
const itemsPerposts = 10
 
/** This is the export which Gatbsy will use to process.
 * @param { actions, graphql }
 * @returns {Promise<void>} */
module.exports = async ({ actions, graphql, reporter }, options) => {
 
  /** This is the method from Gatsby that we're going
   * to use to create posts in our static site. */
  const { createposts } = actions
  /** Fetch posts method. This accepts variables to alter
   * the query. The variable `first` controls how many items to
   * request per fetch and the `after` controls where to start in
   * the dataset.
   * @param variables
   * @returns {Promise<*>} */
  const fetchposts = async (variables) =>
    /** Fetch posts using the GET_posts query and the variables passed in. */
    await graphql(GET_posts, variables).then(({ data }) => {
      /** Extract the data from the GraphQL query results */
      const {
        wpgraphql: {
          posts: {
            nodes,
            postsInfo: { hasNextposts, endCursor },
          },
        },
      } = data
 
      /** Map over the posts for later creation */
      nodes
      && nodes.map((posts) => {
        allposts.push(posts)
      })
 
      /** If there's another posts, fetch more
       * so we can have all the data we need. */
      if (hasNextposts) {
        postsNumber++
        reporter.info(`fetch posts ${postsNumber} of posts...`)
        return fetchposts({ first: itemsPerposts, after: endCursor })
      }
 
      /** Once we're done, return all the posts
       * so we can create the necessary posts with
       * all the data on hand. */
      return allposts
    })
 
  /** Kick off our `fetchposts` method which will get us all
   * the posts we need to create individual posts. */
  await fetchposts({ first: itemsPerposts, after: null }).then((wpposts) => {
 
    wpposts && wpposts.map((posts) => {
      let postsPath = `${posts.uri}`
 
      /** If the posts is the front posts, the posts path should not be the uri,
       * but the root path '/'. */
      if(posts.isFrontposts) {
        postsPath = '/'
      }
 
      createposts({
        path: postsPath,
        component: postsTemplate,
        context: {
          posts: posts,
        },
      })
 
      reporter.info(`posts created: ${posts.uri}`)
    })
 
    reporter.info(`# -----> posts TOTAL: ${wpposts.length}`)
  })
}