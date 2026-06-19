import clsx from "clsx";
import Heading from "@theme/Heading";
import styles from "./styles.module.css";

const FeatureList = [
	{
		title: "Storefront & Theme",
		Svg: require("@site/static/img/undraw_docusaurus_mountain.svg").default,
		description: (
			<>
				The Shopify Liquid theme — VIN and license-plate flows, paint-code
				validation, fitment, and variant selection across aftermarket, CAPA, and
				OEM parts, plus the apps and A/B and Playwright tests around them.
			</>
		),
	},
	{
		title: "Cloud Services & Backend",
		Svg: require("@site/static/img/undraw_docusaurus_tree.svg").default,
		description: (
			<>
				The Google Cloud Run services that power order automation — Finale
				integration, order-status sync and tracking, the fitment proxy, and the
				storefront-supporting APIs, plus how they deploy and where secrets live.
			</>
		),
	},
	{
		title: "Data, Decoding & Operations",
		Svg: require("@site/static/img/undraw_docusaurus_react.svg").default,
		description: (
			<>
				The pipelines tying it together — VIN and paint decoding, Google Sheets
				logging, GitHub workflows and deploys, and the hard-earned edge cases of
				selling custom-painted auto body parts at scale.
			</>
		),
	},
];

function Feature({ Svg, title, description }) {
	return (
		<div className={clsx("col col--4")}>
			<div className="text--center">
				<Svg className={styles.featureSvg} role="img" />
			</div>
			<div className="text--center padding-horiz--md">
				<Heading as="h3">{title}</Heading>
				<p>{description}</p>
			</div>
		</div>
	);
}

export default function HomepageFeatures() {
	return (
		<section className={styles.features}>
			<div className="container">
				<div className="row">
					{FeatureList.map((props, idx) => (
						<Feature key={idx} {...props} />
					))}
				</div>
			</div>
		</section>
	);
}
