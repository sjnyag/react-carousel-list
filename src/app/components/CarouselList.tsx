import React, { CSSProperties, LegacyRef, useState, useCallback, useEffect, useRef, forwardRef } from 'react';
import { Virtuoso, VirtuosoProps } from 'react-virtuoso';
import { FixedSizeGrid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

export type CarouselListProps<Lane extends LaneBase<Item>, Item, Context> = {
  itemWidth: number;
  itemHeight: number;
  laneHeight: number;
  marginWidth?: number;
  marginHeight?: number;
  overscan?: number;
  LaneHeader: React.ComponentType<LaneHeaderProps<Lane>>;
  Cell: React.ComponentType<CellProps<Item>>;
  Footer: React.ComponentType;
  getNextLanes: (lanes: Lane[], skip: number) => Promise<LoadLaneResult<Lane, Item>>;
} & VirtuosoProps<Lane, Context>;

export type LoadLaneResult<Lane extends LaneBase<Item>, Item> = {
  newLanes: Lane[];
  skip: number;
  completed: boolean;
};

export type LaneHeaderProps<Lane> = {
  lane: Lane;
  expand: boolean;
  hasScrollBar: boolean;
  onExpandClick: () => void;
};

export type LaneBase<Item> = {
  title: string;
  items: Item[]
};

export type CellProps<Item> = {
  item: Item;
  width: number;
  height: number;
};

type LaneState = {
  expand: boolean;
  scroll: number;
};

type LoadingState = {
  loading: boolean;
  skip: number;
  completed: boolean;
};

type CarouselListStyle = {
  itemWidth: number;
  itemHeight: number;
  laneHeight: number;
  marginWidth: number;
  marginHeight: number;
};

type CarouselListLaneProps<Lane, Item> = {
  lane: Lane;
  LaneHeader: React.ComponentType<LaneHeaderProps<Lane>>;
  Cell: React.ComponentType<CellProps<Item>>;
  onExpandClick: (expand: boolean) => void;
  onScroll: (scroll: number) => void;
} & CarouselListStyle;

type CarouselListItemsProps<Item> = {
  items: Item[];
  width: number;
  expand: boolean;
  scroll: number;
  Cell: React.ComponentType<CellProps<Item>>;
  onLoad: () => void;
  onScroll: (scroll: number) => void;
} & CarouselListStyle;

type CarouselListCellProps<Item> = {
  width: number;
  height: number;
  style: CSSProperties;
  items: Item[];
  index: number;
  Cell: React.ComponentType<CellProps<Item>>;
};

const CarouselList = <Lane extends LaneBase<Item>, Item, Context>(props: CarouselListProps<Lane, Item, Context>) => {
  const { itemWidth, itemHeight, laneHeight, marginWidth, marginHeight, LaneHeader, Cell, Footer, getNextLanes, ...rest } = props;
  const [lanes, setLanes] = useState<Lane[]>(() => []);
  const [laneLoadingState, setLaneLoadingState] = useState<LoadingState>({ skip: 0, loading: false, completed: false });
  const laneStateRefs = useRef<LaneState[]>([]);

  useEffect(() => {
    if (!laneLoadingState.loading || laneLoadingState.completed) {
      return;
    }
    (async () => {
      const { newLanes, skip, completed } = await getNextLanes(lanes, laneLoadingState.skip);
      setLaneLoadingState({ loading: false, completed, skip });
      setLanes((lanes: Lane[]) => [...lanes, ...newLanes]);
      [...Array(newLanes.length)].forEach((_) => laneStateRefs.current.push({ expand: false, scroll: 0 }));
    })();
  }, [getNextLanes, laneLoadingState, lanes]);

  useEffect(() => {
    loadMore();
  }, []);

  const loadMore = async () => {
    if (laneLoadingState.loading || laneLoadingState.completed) {
      return;
    }
    setLaneLoadingState({ ...laneLoadingState, loading: true })
  };

  return <>
    <Virtuoso
      {...rest}
      data={lanes}
      endReached={loadMore}
      itemContent={(index, lane) => {
        return <CarouselListLane
          itemWidth={itemWidth}
          itemHeight={itemHeight}
          laneHeight={laneHeight}
          marginWidth={marginWidth || 8}
          marginHeight={marginHeight || 8}
          lane={lane}
          LaneHeader={LaneHeader}
          Cell={Cell}
          onScroll={(scroll: number) => {
            if (laneStateRefs?.current[index]) {
              laneStateRefs.current[index].scroll = scroll
            }
          }}
          onExpandClick={(expand: boolean) => {
            if (laneStateRefs?.current[index]) {
              laneStateRefs.current[index].expand = expand
            }
          }}
          {...laneStateRefs.current[index]}
        />
      }}
      components={{ Footer }}
    />
  </>;
};

const CarouselListLane = <Lane extends LaneBase<Item>, Item>(props: LaneState & CarouselListLaneProps<Lane, Item>) => {
  const { lane, itemWidth, itemHeight, laneHeight, marginWidth, marginHeight, expand, scroll, LaneHeader, Cell, onExpandClick, onScroll } = props;
  const gridContainerRef = useRef<any>(null);
  const [expandState, setExpandState] = useState<boolean>(expand);
  const [hasScrollBar, setHasScrollBar] = useState<boolean>(false);

  const checkScrollBar = useCallback(() => {
    const el = gridContainerRef?.current?._outerRef;
    if (!el) {
      return;
    }
    setHasScrollBar(el?.clientWidth < el?.scrollWidth);
  }, []);

  const toggleExpand = useCallback((expandState: boolean) => {
    setExpandState(!expandState);
    onExpandClick(!expandState);
  }, [onExpandClick]);

  useEffect(() => {
    checkScrollBar();
    window.addEventListener('resize', checkScrollBar);
    return () => window.removeEventListener('resize', checkScrollBar);
  }, [gridContainerRef, checkScrollBar, expandState]);

  if (lane.items.length === 0) {
    return <React.Fragment />;
  }

  return (
    <div>
      <LaneHeader
        lane={lane}
        expand={expandState}
        hasScrollBar={hasScrollBar}
        onExpandClick={() => toggleExpand(expandState)}
      />
      <AutoSizer disableHeight>
        {({ width }) => <CarouselListItemsWithRef
          items={lane.items}
          width={width!}
          expand={expandState}
          scroll={scroll}
          ref={gridContainerRef}
          Cell={Cell as any}
          itemWidth={itemWidth}
          itemHeight={itemHeight}
          laneHeight={laneHeight}
          marginWidth={marginWidth}
          marginHeight={marginHeight}
          onLoad={checkScrollBar}
          onScroll={onScroll} />
        }
      </AutoSizer>
    </div>
  );
};

const CarouselListItems = <Item,>(props: CarouselListItemsProps<Item>, ref: LegacyRef<FixedSizeGrid>) => {
  const { items, width, expand, scroll, itemWidth, itemHeight, laneHeight, marginWidth, marginHeight, Cell, onLoad, onScroll } = props;

  useEffect(() => onLoad(), [onLoad]);

  const cardWidth = itemWidth + marginWidth * 2;
  const cardHeight = itemHeight + marginHeight * 2;
  const columnCount = expand ? Math.floor(width / cardWidth) : items.length;
  const rowCount = expand ? Math.ceil(items.length / columnCount) : 1;
  const height = expand ? rowCount * cardHeight : laneHeight;
  const initialScrollLeft = !expand && scroll ? Math.min(scroll || 0, columnCount * cardWidth) : 0;

  return <FixedSizeGrid
    onScroll={(event) => {
      if (scroll === event.scrollLeft) {
        return;
      }
      onScroll(event.scrollLeft)
    }}
    initialScrollLeft={initialScrollLeft}
    ref={ref}
    style={{ overflowY: "hidden" }}
    itemData={items}
    columnCount={columnCount}
    rowCount={rowCount}
    width={width}
    height={height}
    columnWidth={cardWidth}
    rowHeight={cardHeight}
  >{({ rowIndex, columnIndex, style, data }) =>
    <CarouselListCell width={itemWidth} height={itemHeight} style={style} items={data} index={rowIndex * columnCount + columnIndex} Cell={Cell} />}
  </FixedSizeGrid>
};

const CarouselListItemsWithRef = forwardRef(CarouselListItems);

const CarouselListCell = <Item,>(props: CarouselListCellProps<Item>) => {
  const { width, height, style, items, index, Cell } = props;
  if (!items[index]) {
    return <></>;
  }
  return (
    <div style={style}>
      <Cell width={width} height={height} item={items[index]} />
    </div>
  );
};

export default CarouselList;