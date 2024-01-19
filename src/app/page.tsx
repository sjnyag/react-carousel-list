"use client";
import Image from 'next/image'
import CarouselList, { CellProps, LaneHeaderProps } from './components/CarouselList';

type Lane = {
  title: string;
  items: Item[];
};

type Item = {
  id: string;
  author: string;
  download_url: string;
};

const sampleLaneLoader = async (lanes: Lane[], skip: number) => {
  const newLanes: Lane[] = [];
  for (const index of [...Array(5)].map((_, i) => i)) {
    const items = await (await fetch(`https://picsum.photos/v2/list?page=${skip + index + 1}&limit=${index + 5}`)).json();
    newLanes.push({ items, title: `List ${skip + index + 1}` });
  }
  return { newLanes, skip: skip + newLanes.length, completed: false }
};

const getNextLanes = async (lanes: Lane[], skip: number) => await sampleLaneLoader(lanes, skip);

const LaneHeader: React.FunctionComponent<LaneHeaderProps<Lane>> = (props) => {
  const { lane, expand, hasScrollBar, onExpandClick } = props;
  const ExpandButton = () =>
    <svg onClick={onExpandClick} style={{ cursor: "pointer" }} height="24" viewBox="0 -960 960 960" width="24" fill='#757575'>
      <path d="M480-80 240-320l57-57 183 183 183-183 57 57L480-80ZM298-584l-58-56 240-240 240 240-58 56-182-182-182 182Z" />
    </svg>;
  const CollapseButton = () =>
    <svg onClick={onExpandClick} style={{ cursor: "pointer" }} height="24" viewBox="0 -960 960 960" width="24" fill='#757575'>
      <path d="m296-80-56-56 240-240 240 240-56 56-184-184L296-80Zm184-504L240-824l56-56 184 184 184-184 56 56-240 240Z" />
    </svg>;
  return (
    <h2 style={{ paddingLeft: 16, color: '#757575', display: "flex", justifyContent: "start", alignItems: "center", gap: 8, paddingTop: 8 }}>
      {lane.title}{(hasScrollBar || expand) && (expand ? <CollapseButton /> : <ExpandButton />)}
    </h2>
  )
};

const Cell: React.FunctionComponent<CellProps<Item>> = (props) => {
  const { item, width, height } = props;
  return <Image width={width} height={height} src={[...item.download_url.split("/", 5), width, height].join("/")} alt={item.id} />
};

const Footer = () => <div style={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center", color: '#757575', fontSize: "10em" }}>Loading...</div>;

export default function Home() {
  return (
    <main>
      <div style={{ position: "fixed", bottom: 0, width: "100%", height: "100%" }} >
        <CarouselList
          itemWidth={280}
          itemHeight={200}
          laneHeight={200 + 40}
          overscan={5}
          getNextLanes={getNextLanes}
          LaneHeader={LaneHeader}
          Cell={Cell}
          Footer={Footer} />
      </div>
    </main>
  )
}
