import Head from "next/head";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { BLOCKS, INLINES } from "@contentful/rich-text-types";

// Create a bespoke renderOptions object to target BLOCKS.EMBEDDED_ENTRY (linked block entries e.g. code blocks)
// INLINES.EMBEDDED_ENTRY (linked inline entries e.g. a reference to another blog post)
// and BLOCKS.EMBEDDED_ASSET (linked assets e.g. images)

function renderOptions(links) {
  // create an asset map
  const assetMap = new Map();
  // loop through the assets and add them to the map
  if (links.assets) {
    for (const asset of links.assets.block) {
      assetMap.set(asset.sys.id, asset);
    }
  }

  // create an entry map
  const entryMap = new Map();
  // loop through the block linked entries and add them to the map
  if (links.entries.block) {
    for (const entry of links.entries.block) {
      entryMap.set(entry.sys.id, entry);
    }
  }

  // loop through the inline linked entries and add them to the map
  if (links.entries) {
    for (const entry of links.entries.inline) {
      console.log(entry.sys.id + " ---- " + entry);
      entryMap.set(entry.sys.id, entry);
    }
  }

  return {
    renderNode: {
      [INLINES.EMBEDDED_ENTRY]: (node, children) => {
        // find the entry in the entryMap by ID
        console.log("empbedded-entry-inline" + node.data.target.sys.id);
        const entry = entryMap.get(node.data.target.sys.id);

        // render the entries as needed
        if (entry.__typename === "BlogPost") {
          return <a href={`/blog/${entry.slug}`}>{entry.title}</a>;
        }

        if (entry.__typename === "AnchorLink") {
          console.log("in the matching block");
          console.log(entry);
          return (
            <a className={`${entry.styleId}`} href={`${entry.target}`}>
              {entry.title}
            </a>
          );
        }
      },
      [BLOCKS.EMBEDDED_ENTRY]: (node, children) => {
        // find the entry in the entryMap by ID
        const entry = entryMap.get(node.data.target.sys.id);

        // render the entries as needed
        if (entry.__typename === "AnchorLink") {
          return (
            <pre>
              <code>{entry.code}</code>
            </pre>
          );
        }

        // render the entries as needed by looking at the __typename
        // referenced in the GraphQL query

        if (entry.__typename === "VideoEmbed") {
          return (
            <iframe
              src={entry.embedUrl}
              height="100%"
              width="100%"
              frameBorder="0"
              scrolling="no"
              title={entry.title}
              allowFullScreen={true}
            />
          );
        }
      },

      [BLOCKS.EMBEDDED_ASSET]: (node, next) => {
        // find the asset in the assetMap by ID
        const asset = assetMap.get(node.data.target.sys.id);

        // render the asset accordingly
        return (
          <img
            src={asset.url}
            height={asset.height}
            width={asset.width}
            alt={asset.description}
          />
        );
      },
    },
  };
}

export default function GraphQL(props) {
  const { post } = props;

  return (
    <>
      <Head>
        <title>Contentful GraphQL API Example</title>

        <link rel="icon" href="/favicon.ico" />
      </Head>
      <span className="css-z3pjzp">
        <main>
          {documentToReactComponents(
            post.richtext.json,
            renderOptions(post.richtext.links)
          )}
        </main>
      </span>
    </>
  );
}

/**
 * Construct the GraphQL query
 * Define all fields you want to query on the content type
 *
 * IMPORTANT:
 * `body.json` returns a node list (e.g. paragraphs, headings) that also includes REFERENCES nodes to assets and entries.
 * These reference nodes will not be returned with the full data set included from the GraphQL API.
 * To ensure you query the full asset/entry data, ensure you include the fields you want on the content types for the
 * linked entries and assets under body.links.entries, and body.links.assets.
 *
 * The example below shows how to query body.links.entries and body.links.assets for this particular content model.
 */

export async function getStaticProps() {
  const query = `{
    awesomeBlogCollection(limit: 2) {
      items {
        sys {
          id
        }
        title
        richtext {
          json
          links {
            entries {
              inline {
                sys {
                  id
                }
                __typename
                ... on AnchorLink {
                  linkName
                  title
                  target
                  styleId
                  sys {
                    id
                  }
                }
              }
            }
          }
        }
      }
    }
  }`;

  // Construct the fetch options
  const fetchUrl = `https://graphql.contentful.com/content/v1/spaces/${process.env.NEXT_PUBLIC_CONTENTFUL_SPACE_ID}`;

  const fetchOptions = {
    method: "POST",
    headers: {
      Authorization:
        "Bearer " + process.env.NEXT_PUBLIC_CONTENTFUL_ACCESS_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  };

  // Make a call to fetch the data
  const response = await fetch(fetchUrl, fetchOptions).then((response) =>
    response.json()
  );

  const post = response.data.awesomeBlogCollection.items
    ? response.data.awesomeBlogCollection.items
    : [];

  return {
    props: {
      post: post.pop(),
    },
  };
}
